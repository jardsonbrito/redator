import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Home, Download, Search, Calendar, BookOpen, Lock } from "lucide-react";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale/pt-BR";
import { useStudentAuth } from "@/hooks/useStudentAuth";
import { StudentHeader } from "@/components/StudentHeader";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useState } from "react";
import { PDFViewer } from "@/components/admin/PDFViewer";
import { useTurmaERestrictions } from "@/hooks/useTurmaERestrictions";
import { LockedResourceCard } from "@/components/LockedResourceCard";
import { StudentBibliotecaCard } from "@/components/shared/StudentBibliotecaCard";
import { useToast } from "@/hooks/use-toast";
import { useBibliotecaPermissions } from "@/hooks/useBibliotecaPermissions";

const Biblioteca = () => {
  const { studentData } = useStudentAuth();
  const { toast } = useToast();
  const { verificarPermissao } = useBibliotecaPermissions();
  const [busca, setBusca] = useState("");
  const [categoriaFiltro, setCategoriaFiltro] = useState("todas");
  const [pdfViewerOpen, setPdfViewerOpen] = useState(false);
  const [selectedPdf, setSelectedPdf] = useState({ url: '', title: '' });
  
  // Determina a turma do usuário
  let turmaCode = "Visitante";
  if (studentData.userType === "aluno" && studentData.turma) {
    turmaCode = studentData.turma;
  }

  // Buscar categorias disponíveis
  const { data: categorias = [] } = useQuery({
    queryKey: ['categorias'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('categorias')
        .select('*')
        .eq('ativa', true)
        .order('ordem');
      
      if (error) throw error;
      return data;
    }
  });

  const { data: materiais, isLoading, error } = useQuery({
    queryKey: ['biblioteca-materiais', turmaCode, busca, categoriaFiltro],
    queryFn: async () => {
      try {
        let query = supabase
          .from('biblioteca_materiais')
          .select(`
            *,
            categorias (
              id,
              nome,
              slug
            )
          `)
          .eq('status', 'publicado')
          .order('data_publicacao', { ascending: false });

        // Aplica filtros de busca primeiro
        if (busca) {
          query = query.or(`titulo.ilike.%${busca}%,descricao.ilike.%${busca}%`);
        }

        if (categoriaFiltro && categoriaFiltro !== "todas") {
          query = query.eq('categoria_id', categoriaFiltro);
        }
        
        const { data, error } = await query;
        
        if (error) {
          console.error('Database error:', error);
          throw error;
        }
        
        // Filtrar materiais usando a lógica correta de permissões
        const materiaisFiltrados = (data || []).filter((material) => {
          const turmasAutorizadas = material.turmas_autorizadas || [];
          const permiteVisitante = material.permite_visitante;
          
          if (turmaCode === "Visitante") {
            // Visitantes só veem materiais que explicitamente permitem visitantes
            return permiteVisitante === true;
          } else {
            // Alunos veem materiais se:
            // 1. Sua turma está na lista de turmas autorizadas OU
            // 2. O material permite visitantes (se não há turmas específicas)
            const turmaEstaAutorizada = turmasAutorizadas.includes(turmaCode);
            const semRestricaoTurma = turmasAutorizadas.length === 0 && permiteVisitante;
            
            return turmaEstaAutorizada || semRestricaoTurma;
          }
        });
        
        return materiaisFiltrados;
      } catch (error) {
        console.error('Query error:', error);
        throw error;
      }
    }
  });

  const handleDownload = async (materialId: string, arquivoUrl: string, arquivoNome: string, titulo: string) => {
    try {
      // Validar permissões antes do download
      const material = { 
        turmas_autorizadas: [], // Será preenchido pela query principal
        permite_visitante: true 
      };
      
      // Buscar material específico para verificar permissões
      const { data: materialData, error: materialError } = await supabase
        .from('biblioteca_materiais')
        .select('turmas_autorizadas, permite_visitante, titulo')
        .eq('id', materialId)
        .single();

      if (materialError || !materialData) {
        throw new Error('Material não encontrado');
      }

      // Verificar permissão usando o hook
      const podeAcessar = verificarPermissao(materialData);
      
      if (!podeAcessar) {
        toast({
          title: "Acesso negado",
          description: 'Você não tem permissão para baixar este material',
          variant: "destructive"
        });
        return;
      }

      // Gerar URL pública para download
      const { data } = supabase.storage
        .from('biblioteca-pdfs')
        .getPublicUrl(arquivoUrl);
      
      console.log('Download autorizado para:', titulo);
      
      // Tentar download direto
      const fetchResponse = await fetch(data.publicUrl);
      
      if (!fetchResponse.ok) {
        throw new Error(`HTTP error! status: ${fetchResponse.status}`);
      }
      
      const blob = await fetchResponse.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = arquivoNome || 'documento.pdf';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast({
        title: "Download iniciado",
        description: `Download de "${titulo}" foi iniciado com sucesso.`,
        variant: "default"
      });
      
    } catch (error) {
      console.error('Erro ao baixar arquivo:', error);
      toast({
        title: "Erro no download",
        description: "Erro ao baixar o arquivo. Tente novamente.",
        variant: "destructive"
      });
    }
  };

  const handleViewPdf = async (materialId: string, arquivoUrl: string, titulo: string, categoria: string) => {
    try {
      // Para livros digitais, usar visualização inline
      if (categoria.toLowerCase().includes('livro digital')) {
        // Validar permissões usando o hook
        
        // Buscar material específico para verificar permissões
        const { data: materialData, error: materialError } = await supabase
          .from('biblioteca_materiais')
          .select('turmas_autorizadas, permite_visitante, titulo')
          .eq('id', materialId)
          .single();

        if (materialError || !materialData) {
          throw new Error('Material não encontrado');
        }

        const podeAcessar = verificarPermissao(materialData);
        
        if (!podeAcessar) {
          toast({
            title: "Acesso negado",
            description: 'Você não tem permissão para acessar este material',
            variant: "destructive"
          });
          return;
        }

        const { data } = await supabase.storage
          .from('biblioteca-pdfs')
          .getPublicUrl(arquivoUrl);
        
        setSelectedPdf({
          url: data.publicUrl,
          title: titulo
        });
        setPdfViewerOpen(true);
      } else {
        // Para outras categorias, fazer download normal
        // Buscar o nome do arquivo original
        const { data: materialData } = await supabase
          .from('biblioteca_materiais')
          .select('arquivo_nome')
          .eq('id', materialId)
          .single();
          
        await handleDownload(materialId, arquivoUrl, materialData?.arquivo_nome || 'documento.pdf', titulo);
      }
    } catch (error) {
      console.error('Erro ao visualizar arquivo:', error);
      toast({
        title: "Erro de acesso",
        description: "Erro ao acessar o material. Tente novamente.",
        variant: "destructive"
      });
    }
  };

  // Agrupar materiais por categoria
  const materiaisAgrupados = materiais?.reduce((grupos: any, material: any) => {
    const categoriaNome = material.categorias?.nome || 'Sem categoria';
    if (!grupos[categoriaNome]) {
      grupos[categoriaNome] = [];
    }
    grupos[categoriaNome].push(material);
    return grupos;
  }, {}) || {};

  // Verificar se é visitante
  const isVisitante = turmaCode === "Visitante";

  if (isLoading) {
    return (
      <ProtectedRoute>
        <TooltipProvider>
          <div className="min-h-screen bg-gradient-to-br from-purple-50 to-violet-100">
            <StudentHeader pageTitle="Biblioteca" />
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
              <div className="text-center">Carregando materiais...</div>
            </main>
          </div>
        </TooltipProvider>
      </ProtectedRoute>
    );
  }

  if (error) {
    console.error('Biblioteca error:', error);
  }

  return (
    <ProtectedRoute>
      <TooltipProvider>
        <div className="min-h-screen bg-gradient-to-br from-purple-50 to-violet-100">
          <StudentHeader pageTitle="Biblioteca" />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Filtros */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
          <div className="grid md:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Buscar por título ou descrição..."
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select value={categoriaFiltro} onValueChange={setCategoriaFiltro}>
              <SelectTrigger>
                <SelectValue placeholder="Filtrar por categoria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas as categorias</SelectItem>
                {categorias.map((categoria) => (
                  <SelectItem key={categoria.id} value={categoria.id}>
                    {categoria.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="text-sm text-gray-600 flex items-center">
              <Calendar className="w-4 h-4 mr-2" />
              {materiais?.length || 0} material(is) encontrado(s)
            </div>
          </div>
        </div>

        {!materiais || materiais.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <Home className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-600 mb-2">
                Nenhum material nesta categoria
              </h3>
            </CardContent>
          </Card>
        ) : categoriaFiltro !== "todas" ? (
          // Quando um filtro específico está ativo, mostrar apenas essa categoria
          <div className="space-y-8">
            {(() => {
              const categoriaEscolhida = categorias.find(cat => cat.id === categoriaFiltro);
              const materiaisCategoria = materiaisAgrupados[categoriaEscolhida?.nome] || [];
              
              if (materiaisCategoria.length === 0) {
                return (
                  <Card>
                    <CardContent className="text-center py-12">
                      <BookOpen className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold text-gray-600 mb-2">
                        Nenhum material nesta categoria
                      </h3>
                    </CardContent>
                  </Card>
                );
              }

              return (
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <h3 className="text-2xl font-bold text-redator-primary">
                      {categoriaEscolhida?.nome}
                    </h3>
                    <Badge variant="outline" className="text-sm">
                      {materiaisCategoria.length} material(is)
                    </Badge>
                  </div>
                  
                  <div className="grid gap-6 lg:grid-cols-1 xl:grid-cols-2">
                      {materiaisCategoria.map((material) => {
                        const isLivroDigital = categoriaEscolhida?.nome.toLowerCase().includes('livro digital');
                        // Verificar se o usuário pode acessar baseado na lógica correta
                        const turmasAutorizadas = material.turmas_autorizadas || [];
                        const permiteVisitante = material.permite_visitante;
                        
                        let podeAcessar = false;
                        if (turmaCode === "Visitante") {
                          podeAcessar = permiteVisitante === true;
                        } else {
                          const turmaEstaAutorizada = turmasAutorizadas.includes(turmaCode);
                          const semRestricaoTurma = turmasAutorizadas.length === 0 && permiteVisitante;
                          podeAcessar = turmaEstaAutorizada || semRestricaoTurma;
                        }
                        
                        return (
                          <StudentBibliotecaCard
                            key={material.id}
                            title={material.titulo}
                            description={material.descricao}
                            coverUrl={material.thumbnail_url}
                            coverAlt={`Capa do material ${material.titulo}`}
                            categoria={material.categorias?.nome || 'Sem categoria'}
                            publishedAt={material.published_at}
                            unpublishedAt={material.unpublished_at}
                            isLivroDigital={isLivroDigital}
                            podeAcessar={podeAcessar}
                            onViewPdf={() => handleViewPdf(
                              material.id,
                              material.arquivo_url, 
                              material.titulo,
                              categoriaEscolhida?.nome || ''
                            )}
                          />
                        );
                      })}
                  </div>
                </div>
              );
            })()}
          </div>
        ) : (
          // Quando "Todas as categorias" está selecionado, mostrar apenas categorias com materiais
          <div className="space-y-8">
            {categorias
              .filter((categoria) => {
                const materiaisCategoria = materiaisAgrupados[categoria.nome] || [];
                return materiaisCategoria.length > 0;
              })
              .map((categoria) => {
                const materiaisCategoria = materiaisAgrupados[categoria.nome] || [];
                
                return (
                  <div key={categoria.id} className="space-y-4">
                    <div className="flex items-center gap-3">
                      <h3 className="text-2xl font-bold text-redator-primary">
                        {categoria.nome}
                      </h3>
                      <Badge variant="outline" className="text-sm">
                        {materiaisCategoria.length} material(is)
                      </Badge>
                    </div>
                    
                    <div className="grid gap-6 lg:grid-cols-1 xl:grid-cols-2">
                      {materiaisCategoria.map((material) => {
                        const isLivroDigital = categoria.nome.toLowerCase().includes('livro digital');
                        // Verificar se o usuário pode acessar baseado na lógica correta
                        const turmasAutorizadas = material.turmas_autorizadas || [];
                        const permiteVisitante = material.permite_visitante;
                        
                        let podeAcessar = false;
                        if (turmaCode === "Visitante") {
                          podeAcessar = permiteVisitante === true;
                        } else {
                          const turmaEstaAutorizada = turmasAutorizadas.includes(turmaCode);
                          const semRestricaoTurma = turmasAutorizadas.length === 0 && permiteVisitante;
                          podeAcessar = turmaEstaAutorizada || semRestricaoTurma;
                        }
                        
                        return (
                          <StudentBibliotecaCard
                            key={material.id}
                            title={material.titulo}
                            description={material.descricao}
                            coverUrl={material.thumbnail_url}
                            coverAlt={`Capa do material ${material.titulo}`}
                            categoria={material.categorias?.nome || 'Sem categoria'}
                            publishedAt={material.published_at}
                            unpublishedAt={material.unpublished_at}
                            isLivroDigital={isLivroDigital}
                            podeAcessar={podeAcessar}
                            onViewPdf={() => handleViewPdf(
                              material.id,
                              material.arquivo_url, 
                              material.titulo,
                              categoria.nome
                            )}
                          />
                        );
                      })}
                    </div>
                  </div>
                );
              })}
          </div>
        )}
        </main>
        </div>

        {/* Modal do PDF Viewer */}
        <PDFViewer
          open={pdfViewerOpen}
          onOpenChange={setPdfViewerOpen}
          pdfUrl={selectedPdf.url}
          title={selectedPdf.title}
        />
      </TooltipProvider>
    </ProtectedRoute>
  );
};

export default Biblioteca;