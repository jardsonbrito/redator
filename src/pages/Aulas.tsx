import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StudentHeader } from "@/components/StudentHeader";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useStudentAuth } from "@/hooks/useStudentAuth";
import { useRecordedLessonViews } from "@/hooks/useRecordedLessonViews";
import { supabase } from "@/integrations/supabase/client";
import { Search, CheckCircle } from "lucide-react";
import { UnifiedCard, UnifiedCardSkeleton, type BadgeTone, type UnifiedCardItem } from "@/components/ui/unified-card";
import { resolveAulaCover } from "@/utils/coverUtils";
import { useToast } from "@/hooks/use-toast";

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
  const { studentData } = useStudentAuth();
  const { markAsWatched, isWatched } = useRecordedLessonViews();
  const [aulas, setAulas] = useState<Aula[]>([]);
  const [filteredAulas, setFilteredAulas] = useState<Aula[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [moduloFilter, setModuloFilter] = useState("");
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

  useEffect(() => {
    filterAulas();
  }, [aulas, searchTerm, moduloFilter]);

  const fetchAulas = async () => {
    try {
      const { data, error } = await supabase
        .from("aulas")
        .select(`
          *,
          modulos!inner(nome)
        `)
        .eq("ativo", true)
        .order("criado_em", { ascending: false });

      if (error) throw error;
      setAulas((data || []).map(aula => ({
        ...aula,
        modulo: aula.modulos?.nome || 'Sem módulo'
      })));
    } catch (error) {
      console.error("Erro ao buscar aulas:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const filterAulas = () => {
    console.log('🔍 Filtrando aulas:', { 
      totalAulas: aulas.length, 
      userType: studentData.userType, 
      userTurma: studentData.turma 
    });

    let filtered = aulas.filter(aula => {
      console.log('📚 Verificando aula:', { 
        titulo: aula.titulo, 
        turmasAutorizadas: aula.turmas_autorizadas, 
        permiteVisitante: aula.permite_visitante,
        ativo: aula.ativo
      });

      // Verificar se o usuário tem acesso
      const isVisitante = studentData.userType === "visitante";
      const userTurma = studentData.turma;

      // Permitir se for visitante e aula permite visitante
      if (isVisitante && aula.permite_visitante) {
        console.log('✅ Acesso de visitante permitido');
        return true;
      }
      
      // Permitir se for aluno e está na turma autorizada ou se turmas_autorizadas está vazio/null
      if (!isVisitante && userTurma && userTurma !== "visitante") {
        const turmasAutorizadas = aula.turmas_autorizadas || [];
        // Comparação case-insensitive para as turmas
        const hasAccess = turmasAutorizadas.length === 0 || 
          turmasAutorizadas.some(turma => turma.toUpperCase() === userTurma.toUpperCase());
        console.log('👤 Verificando acesso do aluno:', { userTurma, turmasAutorizadas, hasAccess });
        return hasAccess;
      }

      console.log('❌ Acesso negado');
      return false;
    });

    // Aplicar filtros de busca
    if (searchTerm) {
      filtered = filtered.filter(aula =>
        aula.titulo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        aula.descricao.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (moduloFilter && moduloFilter !== "todos") {
      filtered = filtered.filter(aula => aula.modulo === moduloFilter);
    }

    console.log('📊 Resultado da filtragem:', { totalFiltradas: filtered.length });
    setFilteredAulas(filtered);
  };

  const handleAssistirAula = async (aula: Aula) => {
    // Marcar como assistida primeiro (se for vídeo gravado)
    if (aula.video_id || aula.embed_url || aula.video_url_original) {
      await markAsWatched(aula.id, aula.titulo);
    }
    
    // Determinar a melhor URL para abrir
    let videoUrl = '';
    
    // Priorizar embed_url ou video_url_original
    if (aula.embed_url) {
      videoUrl = aula.embed_url;
    } else if (aula.video_url_original) {
      videoUrl = aula.video_url_original;
    } else if (aula.link_conteudo) {
      // Verificar se é uma URL do YouTube e convertê-la se necessário
      const youtubeMatch = aula.link_conteudo.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/);
      if (youtubeMatch && youtubeMatch[1]) {
        // Converter para formato embed que funciona melhor
        videoUrl = `https://www.youtube.com/watch?v=${youtubeMatch[1]}`;
      } else {
        videoUrl = aula.link_conteudo;
      }
    }

    if (videoUrl) {
      try {
        // Abrir em nova aba
        const newWindow = window.open(videoUrl, '_blank', 'noopener,noreferrer');
        if (!newWindow) {
          toast({
            title: "Bloqueador de pop-up detectado",
            description: "Por favor, permita pop-ups para este site ou tente novamente.",
            variant: "destructive"
          });
        }
      } catch (error) {
        console.error('Erro ao abrir vídeo:', error);
        toast({
          title: "Erro",
          description: "Não foi possível abrir o vídeo. Tente novamente.",
          variant: "destructive"
        });
      }
    } else {
      toast({
        title: "Erro",
        description: "Link do vídeo não disponível.",
        variant: "destructive"
      });
    }
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

          {/* Lista de Aulas */}
          <div className="grid gap-6 grid-cols-1 lg:grid-cols-2 mx-1 sm:mx-0">
            {filteredAulas.length === 0 ? (
              <Card>
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
                const coverUrl = resolveAulaCover(aula);
                const tone: BadgeTone = aula.modulo === 'Aula ao vivo' ? 'warning' : 'primary';
                const badges: { label: string; tone: BadgeTone }[] = [];
                
                if (aula.modulo) badges.push({ label: aula.modulo, tone });
                if (aula.platform) badges.push({ label: aula.platform.toUpperCase(), tone: 'neutral' });
                
                // Adicionar badge "Assistida" se for vídeo gravado e já foi assistido
                const isVideoContent = aula.video_id || aula.embed_url || aula.video_url_original;
                if (isVideoContent && isWatched(aula.id)) {
                  badges.push({ label: "Assistida", tone: 'success' });
                }
                
                const cardItem: UnifiedCardItem = {
                  coverUrl,
                  title: aula.titulo,
                  subtitle: aula.descricao,
                  badges,
                  cta: {
                    label: "Assistir",
                    onClick: () => handleAssistirAula(aula),
                    ariaLabel: `Assistir ${aula.titulo}`
                  },
                  ariaLabel: `Aula: ${aula.titulo}`
                };

                // Adicionar botão de PDF se disponível
                if (aula.pdf_url) {
                  cardItem.secondaryCta = {
                    label: "Baixar PDF",
                    onClick: () => handleDownloadPdf(aula),
                    ariaLabel: `Baixar material em PDF da aula ${aula.titulo}`
                  };
                }

                return (
                  <UnifiedCard
                    key={aula.id}
                    variant="aluno"
                    item={cardItem}
                  />
                );
              })
            )}
          </div>
        </main>
        </div>
      </TooltipProvider>
    </ProtectedRoute>
  );
};

export default Aulas;