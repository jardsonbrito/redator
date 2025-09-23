import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Library, Search, Calendar, BookOpen } from "lucide-react";
import { BibliotecaCardPadrao, BibliotecaCardData } from "@/components/shared/BibliotecaCardPadrao";
import { CorretorLayout } from "@/components/corretor/CorretorLayout";

const CorretorBiblioteca = () => {
  const [busca, setBusca] = useState("");
  const [categoriaFiltro, setCategoriaFiltro] = useState("todas");

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
    queryKey: ['biblioteca-corretor', busca, categoriaFiltro],
    queryFn: async () => {
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

      if (busca) {
        query = query.or(`titulo.ilike.%${busca}%,descricao.ilike.%${busca}%`);
      }

      if (categoriaFiltro && categoriaFiltro !== 'todas') {
        query = query.eq('categoria_id', categoriaFiltro);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    }
  });

  if (isLoading) {
    return (
      <CorretorLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Biblioteca</h1>
          </div>
          <div className="text-center">Carregando materiais...</div>
        </div>
      </CorretorLayout>
    );
  }

  if (error) {
    return (
      <CorretorLayout>
        <div className="text-center py-8">
          <p className="text-red-600">Erro ao carregar materiais. Tente novamente.</p>
        </div>
      </CorretorLayout>
    );
  }

  // Agrupar materiais por categoria
  const materiaisAgrupados = materiais?.reduce((grupos: any, material: any) => {
    const categoriaNome = material.categorias?.nome || 'Sem categoria';
    if (!grupos[categoriaNome]) {
      grupos[categoriaNome] = [];
    }
    grupos[categoriaNome].push(material);
    return grupos;
  }, {}) || {};

  const handleViewPdf = async (materialId: string, arquivoUrl: string, titulo: string, categoria: string) => {
    // Corretor tem acesso a tudo, apenas abrir o arquivo
    window.open(arquivoUrl, '_blank');
  };

  return (
    <CorretorLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Biblioteca</h1>
        </div>

        {/* Filtros */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
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
              <Library className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-600 mb-2">
                Nenhum material disponível
              </h3>
              <p className="text-gray-500">
                Os materiais aparecerão aqui quando forem publicados.
              </p>
            </CardContent>
          </Card>
        ) : categoriaFiltro !== "todas" ? (
          // Quando um filtro específico está ativo
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

                  <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                      {materiaisCategoria.map((material) => {
                        const isLivroDigital = categoriaEscolhida?.nome.toLowerCase().includes('livro digital');

                        const materialData: BibliotecaCardData = {
                          id: material.id,
                          titulo: material.titulo,
                          subtitulo: material.descricao,
                          competencia: material.competencia,
                          categoria: material.categorias?.nome,
                          unpublished_at: material.unpublished_at,
                          thumbnail_url: material.thumbnail_url,
                          arquivo_url: material.arquivo_url,
                          arquivo_nome: material.arquivo_nome
                        };

                        return (
                          <BibliotecaCardPadrao
                            key={material.id}
                            material={materialData}
                            perfil="corretor"
                            actions={{
                              onBaixar: () => handleViewPdf(
                                material.id,
                                material.arquivo_url,
                                material.titulo,
                                categoriaEscolhida?.nome || ''
                              )
                            }}
                          />
                        );
                      })}
                  </div>
                </div>
              );
            })()}
          </div>
        ) : (
          // Quando "Todas as categorias" está selecionado, mostrar na ordem original
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {materiais.map((material) => {
              const materialData: BibliotecaCardData = {
                id: material.id,
                titulo: material.titulo,
                subtitulo: material.descricao,
                competencia: material.competencia,
                categoria: material.categorias?.nome,
                unpublished_at: material.unpublished_at,
                thumbnail_url: material.thumbnail_url,
                arquivo_url: material.arquivo_url,
                arquivo_nome: material.arquivo_nome
              };

              return (
                <BibliotecaCardPadrao
                  key={material.id}
                  material={materialData}
                  perfil="corretor"
                  actions={{
                    onBaixar: () => handleViewPdf(
                      material.id,
                      material.arquivo_url,
                      material.titulo,
                      material.categorias?.nome || ''
                    )
                  }}
                />
              );
            })}
          </div>
        )}
      </div>
    </CorretorLayout>
  );
};

export default CorretorBiblioteca;