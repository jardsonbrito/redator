import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StudentHeader } from "@/components/StudentHeader";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useStudentAuth } from "@/hooks/useStudentAuth";
import { useRecordedLessonViews } from "@/hooks/useRecordedLessonViews";
import { supabase } from "@/integrations/supabase/client";
import { usePlanFeatures } from "@/hooks/usePlanFeatures";
import { Navigate, useSearchParams } from "react-router-dom";
import { Search, CheckCircle, BookMarked } from "lucide-react";
import { UnifiedCard, UnifiedCardSkeleton, type BadgeTone, type UnifiedCardItem } from "@/components/ui/unified-card";
import { resolveAulaCover } from "@/utils/coverUtils";
import { AulaGravadaCardPadrao } from "@/components/shared/AulaGravadaCardPadrao";
import { AulaVideoModal } from "@/components/shared/AulaVideoModal";
import { useToast } from "@/hooks/use-toast";
import { usePageTitle } from "@/hooks/useBreadcrumbs";

interface Aula {
  id: string;
  titulo: string;
  descricao: string;
  modulo: string;
  link_conteudo: string;
  pdf_url?: string;
  pdf_nome?: string;
  turmas_autorizadas: string[] | null;
  permite_visitante: boolean;
  ativo: boolean;
  criado_em: string;
  // Video metadata fields
  video_thumbnail_url?: string | null;
  platform?: string | null;
  video_id?: string | null;
  embed_url?: string | null;
  video_url_original?: string | null;
  cover_source?: string | null;
  cover_file_path?: string | null;
  cover_url?: string | null;
}

const Aulas = () => {
  // Configurar título da página
  usePageTitle('Aulas');

  const { studentData } = useStudentAuth();
  const { markAsWatched, isWatched, confirmAsWatched, isConfirmed, isConfirming } = useRecordedLessonViews();
  const { isFeatureEnabled } = usePlanFeatures(studentData.email);
  const [searchParams] = useSearchParams();
  const aulaDestaque = searchParams.get('aula'); // ID vindo do PEP (missão vinculada)
  const aulaDestaqueRef = useRef<HTMLDivElement | null>(null);
  const [aulas, setAulas] = useState<Aula[]>([]);
  const [filteredAulas, setFilteredAulas] = useState<Aula[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [moduloFilter, setModuloFilter] = useState("");
  // Atualização otimista: IDs das aulas abertas nesta sessão (antes do refetch do banco)
  const [aulasAbertasLocal, setAulasAbertasLocal] = useState<Set<string>>(new Set());
  // Atualização otimista: IDs das aulas confirmadas nesta sessão
  const [aulasConfermadasLocal, setAulasConfermadasLocal] = useState<Set<string>>(new Set());
  // Aula sendo exibida no modal inline
  const [aulaEmReproducao, setAulaEmReproducao] = useState<Aula | null>(null);
  const { toast } = useToast();

  const modulosDisponiveis = [
    'Competência 1',
    'Competência 2',
    'Competência 3',
    'Competência 4',
    'Competência 5',
    'Aula ao vivo'
  ];

  useEffect(() => {
    fetchAulas();
  }, []);

  // Scroll automático para a aula vinculada ao PEP quando a lista carrega
  useEffect(() => {
    if (!aulaDestaque || isLoading || filteredAulas.length === 0) return;
    if (aulaDestaqueRef.current) {
      setTimeout(() => {
        aulaDestaqueRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 300);
    }
  }, [aulaDestaque, isLoading, filteredAulas]);

  useEffect(() => {
    filterAulas();
  }, [aulas, searchTerm, moduloFilter]);

  const fetchAulas = async () => {
    try {
      console.log('🔄 Buscando aulas - userType:', studentData.userType, 'turma:', studentData.turma);
      console.log('🔄 Dados do estudante completos:', JSON.stringify(studentData, null, 2));
      
      // Validar dados antes de fazer a consulta
      const userType = studentData.userType || null;
      const userTurma = (studentData.userType === 'aluno' && studentData.turma) ? studentData.turma : null;
      
      console.log('📋 Parâmetros para RPC:', { userType, userTurma });
      
      // Usar a nova função RPC que garante acesso correto em produção
      const { data, error } = await supabase.rpc('get_accessible_aulas', {
        p_user_type: userType,
        p_user_turma: userTurma
      });

      if (error) {
        console.error("❌ Erro na consulta RPC:", {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        });
        throw error;
      }
      
      console.log('📊 Aulas encontradas via RPC:', data?.length || 0);
      
      if (data && data.length > 0) {
        console.log('📋 Exemplo de aula (primeira):', JSON.stringify(data[0], null, 2));
        console.log('📋 Tipos de dados das turmas_autorizadas:', typeof data[0]?.turmas_autorizadas, data[0]?.turmas_autorizadas);
      } else {
        console.warn('⚠️ Nenhuma aula encontrada na consulta RPC');
      }
      
      const processedAulas = (data || []).map(aula => {
        const processed = {
          ...aula,
          modulo: aula.modulo_nome || 'Sem módulo'
        };
        console.log('🔧 Aula processada:', { 
          id: processed.id, 
          titulo: processed.titulo, 
          turmas_autorizadas: processed.turmas_autorizadas,
          permite_visitante: processed.permite_visitante
        });
        return processed;
      });
      
      setAulas(processedAulas);
      
    } catch (error) {
      console.error("❌ Erro completo ao buscar aulas:", error);
      toast({
        title: "Erro ao carregar aulas",
        description: error.message || "Não foi possível carregar as aulas. Tente recarregar a página.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const filterAulas = () => {
    console.log('🔍 Aplicando filtros locais de busca e módulo');

    let filtered = aulas;

    // Aplicar apenas filtros de busca e módulo (a filtragem por turma já foi feita na RPC)
    if (searchTerm) {
      filtered = filtered.filter(aula =>
        aula.titulo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        aula.descricao.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (moduloFilter && moduloFilter !== "todos") {
      filtered = filtered.filter(aula => aula.modulo === moduloFilter);
    }

    console.log('📊 Resultado da filtragem local:', { 
      totalOriginal: aulas.length,
      totalFiltradas: filtered.length,
      searchTerm,
      moduloFilter 
    });
    setFilteredAulas(filtered);
  };

  const handleConfirmar = async (id: string, titulo: string) => {
    // Atualização otimista: muda botão imediatamente
    setAulasConfermadasLocal(prev => new Set(prev).add(id));
    await confirmAsWatched(id, titulo);
  };

  const handleAssistirAula = (aula: Aula) => {
    // Atualização otimista: revela o botão "Confirmar" imediatamente
    setAulasAbertasLocal(prev => new Set(prev).add(aula.id));

    // Com embed_url disponível → reprodução inline no modal
    if (aula.embed_url) {
      setAulaEmReproducao(aula);
      markAsWatched(aula.id, aula.titulo);
      return;
    }

    // Sem embed_url → fallback para nova aba (comportamento anterior)
    let videoUrl = aula.video_url_original || aula.link_conteudo || '';

    if (!videoUrl) {
      toast({
        title: "Erro",
        description: "Link do vídeo não disponível.",
        variant: "destructive"
      });
      return;
    }

    try {
      const newWindow = window.open(videoUrl, '_blank', 'noopener,noreferrer');
      if (!newWindow) {
        toast({
          title: "Bloqueador de pop-up detectado",
          description: "Por favor, permita pop-ups para este site ou tente novamente.",
          variant: "destructive"
        });
      }
    } catch {
      toast({ title: "Erro", description: "Não foi possível abrir o vídeo.", variant: "destructive" });
    }

    markAsWatched(aula.id, aula.titulo);
  };

  const handleDownloadPdf = async (aula: Aula) => {
    try {
      if (!aula.pdf_url) {
        toast({
          title: "Erro",
          description: "PDF não disponível.",
          variant: "destructive"
        });
        return;
      }

      const a = document.createElement('a');
      a.href = aula.pdf_url;
      a.setAttribute('download', aula.pdf_nome || 'material.pdf');
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (error) {
      toast({
        title: "Erro",
        description: "PDF indisponível no momento.",
        variant: "destructive"
      });
    }
  };

  // Se a funcionalidade está desabilitada pelo plano, redirecionar
  if (!isFeatureEnabled('aulas_gravadas')) {
    return <Navigate to="/app" replace />;
  }

  if (isLoading) {
    return (
      <ProtectedRoute>
        <TooltipProvider>
          <div className="min-h-screen bg-gradient-to-br from-purple-50 to-violet-100">
          <StudentHeader pageTitle="Aulas" />
          <div className="max-w-6xl mx-auto px-4 py-8 space-y-4">
            <UnifiedCardSkeleton />
            <UnifiedCardSkeleton />
            <UnifiedCardSkeleton />
          </div>
          </div>
        </TooltipProvider>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <TooltipProvider>
        <div className="min-h-screen bg-gradient-to-br from-purple-50 to-violet-100">
        <StudentHeader pageTitle="Aulas" />

        <main className="max-w-6xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8">

          {/* Filtros */}
          <Card className="mb-4 sm:mb-6 mx-1 sm:mx-0">
            <CardHeader className="pb-3 sm:pb-6">
              <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                <Search className="w-4 h-4 sm:w-5 sm:h-5" />
                Filtros
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <Input
                    placeholder="Buscar por título ou descrição..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="text-sm sm:text-base"
                  />
                </div>
                <div>
                  <Select value={moduloFilter} onValueChange={setModuloFilter}>
                    <SelectTrigger className="text-sm sm:text-base">
                      <SelectValue placeholder="Filtrar por módulo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todos os módulos</SelectItem>
                      {modulosDisponiveis.map((modulo) => (
                        <SelectItem key={modulo} value={modulo}>
                          {modulo}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Banner de missão vinculada (quando vem do PEP) */}
          {aulaDestaque && filteredAulas.some(a => a.id === aulaDestaque) && (
            <div className="flex items-center gap-2 mb-4 px-4 py-3 bg-[#f1e4fe] border border-[#c8a8f0] rounded-xl mx-1 sm:mx-0">
              <BookMarked className="w-4 h-4 text-[#3f0776] flex-shrink-0" />
              <p className="text-sm text-[#3f0776] font-medium">
                Aula vinculada ao seu Plano de Estudo — destacada abaixo.
              </p>
            </div>
          )}

          {/* Lista de Aulas */}
          <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 mx-1 sm:mx-0">
            {filteredAulas.length === 0 ? (
              <Card className="col-span-full">
                <CardContent className="text-center py-8 sm:py-12">
                  <h3 className="text-lg sm:text-xl font-semibold text-redator-primary mb-2">
                    Nenhuma aula disponível no momento.
                  </h3>
                  <p className="text-redator-accent text-sm sm:text-base">
                    Verifique novamente em breve ou entre em contato com sua coordenação.
                  </p>
                </CardContent>
              </Card>
            ) : (
              filteredAulas.map((aula) => {
                const isDestaque = aula.id === aulaDestaque;
                return (
                  <div
                    key={aula.id}
                    ref={isDestaque ? aulaDestaqueRef : null}
                    className={isDestaque ? 'ring-2 ring-[#3f0776] ring-offset-2 rounded-2xl' : ''}
                  >
                    <AulaGravadaCardPadrao
                      aula={aula}
                      perfil="aluno"
                      isWatched={isWatched(aula.id) || aulasAbertasLocal.has(aula.id)}
                      isConfirmed={isConfirmed(aula.id) || aulasConfermadasLocal.has(aula.id)}
                      isConfirming={isConfirming}
                      actions={{
                        onAssistir: () => handleAssistirAula(aula),
                        onConfirmar: (id) => handleConfirmar(id, aula.titulo),
                        onBaixarPdf: aula.pdf_url ? () => handleDownloadPdf(aula) : undefined,
                      }}
                    />
                  </div>
                );
              })
            )}
          </div>
        </main>
        </div>

        {/* Modal de reprodução inline */}
        <AulaVideoModal
          aula={aulaEmReproducao}
          isConfirmed={aulaEmReproducao ? (isConfirmed(aulaEmReproducao.id) || aulasConfermadasLocal.has(aulaEmReproducao.id)) : false}
          isConfirming={isConfirming}
          onClose={() => setAulaEmReproducao(null)}
          onConfirmar={(id, titulo) => handleConfirmar(id, titulo)}
        />
      </TooltipProvider>
    </ProtectedRoute>
  );
};

export default Aulas;