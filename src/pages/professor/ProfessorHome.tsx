import { useMemo } from "react";
import {
  BookOpen, FileText, Video, GraduationCap, Library,
  Map, Layers, Bot, ClipboardCheck, NotebookPen,
  MessageCircle, Trophy, Star, Sparkles, PlayCircle,
} from "lucide-react";
import { RedacoesComentadasIcon } from "@/components/icons/RedacoesComentadasIcon";
import { LaboratorioIcon } from "@/components/icons/LaboratorioIcon";
import { TooltipProvider } from "@/components/ui/tooltip";
import { StudentHeader } from "@/components/StudentHeader";
import { ProfessorMenuGrid } from "@/components/professor/ProfessorMenuGrid";
import { CalendarioAtividades } from "@/components/CalendarioAtividades";
import { MuralAvisos } from "@/components/MuralAvisos";
import { ProfessorBottomNavigation } from "@/components/professor/ProfessorBottomNavigation";
import { useProfessorAuth } from "@/hooks/useProfessorAuth";
import { useBreadcrumbs } from "@/hooks/useBreadcrumbs";
import { useProfessorFeatures } from "@/hooks/useProfessorFeatures";
import { useJarvisVideoInstrucao } from "@/hooks/useJarvisVideoInstrucao";
import { JarvisVideoModal } from "@/components/professor/JarvisVideoModal";
import { ProfessorJarvisCorrecao } from "@/pages/professor/ProfessorJarvisCorrecao";

const CHAVE_CONFIG: Record<string, { title: string; path: string; icon: any; tooltip: string }> = {
  jarvis_correcao: {
    title: "Jarvis",
    path: "/professor/jarvis-correcao",
    icon: Bot,
    tooltip: "Correção inteligente de redações com IA — agrupe seus alunos e analise os textos.",
  },
  aula_pronta: {
    title: "Aula Pronta",
    path: "/professor/aula-pronta",
    icon: Sparkles,
    tooltip: "Gere planos de aula, quizzes e questões com IA em segundos.",
  },
  temas: {
    title: "Temas",
    path: "/professor/temas",
    icon: BookOpen,
    tooltip: "Explore propostas de redação organizadas por eixo temático.",
  },
  guia_tematico: {
    title: "Guia Temático",
    path: "/professor/guia-tematico",
    icon: Map,
    tooltip: "Percorra um roteiro completo de aprofundamento sobre a frase temática.",
  },
  simulados: {
    title: "Simulados",
    path: "/professor/simulados",
    icon: ClipboardCheck,
    tooltip: "Simulados gerenciados pelo Laboratório.",
  },
  exercicios: {
    title: "Exercícios",
    path: "/professor/exercicios",
    icon: NotebookPen,
    tooltip: "Pratique com exercícios direcionados.",
  },
  redacoes_exemplares: {
    title: "Redações Exemplares",
    path: "/professor/redacoes",
    icon: FileText,
    tooltip: "Veja textos nota 1000 e aprenda estratégias eficazes.",
  },
  redacoes_comentadas: {
    title: "Redações Comentadas",
    path: "/professor/redacoes-comentadas",
    icon: RedacoesComentadasIcon,
    tooltip: "Analise redações com comentários detalhados e anotações por trecho.",
  },
  videoteca: {
    title: "Videoteca",
    path: "/professor/videoteca",
    icon: Video,
    tooltip: "Acesse vídeos para enriquecer o repertório sociocultural.",
  },
  aulas_gravadas: {
    title: "Aulas Gravadas",
    path: "/professor/aulas",
    icon: GraduationCap,
    tooltip: "Acesse aulas organizadas por competência.",
  },
  aulas_ao_vivo: {
    title: "Aulas ao Vivo",
    path: "/professor/salas-virtuais",
    icon: Video,
    tooltip: "Participe de aulas ao vivo com registro de frequência.",
  },
  microaprendizagem: {
    title: "Microaprendizagem",
    path: "/professor/microaprendizagem",
    icon: Layers,
    tooltip: "Conteúdos rápidos em vídeo, áudio, quiz e mais.",
  },
  laboratorio_repertorio: {
    title: "Laboratório de Repertório",
    path: "/professor/laboratorio-repertorio",
    icon: LaboratorioIcon,
    tooltip: "Aulas em 3 etapas: Contexto → Repertório → Aplicação.",
  },
  repertorio_orientado: {
    title: "Repertório Orientado",
    path: "/professor/repertorio",
    icon: Library,
    tooltip: "Publique parágrafos com repertório e receba feedback dos colegas.",
  },
  biblioteca: {
    title: "Biblioteca",
    path: "/professor/biblioteca",
    icon: Library,
    tooltip: "Acesse materiais em PDF organizados por competência.",
  },
  diario_online: {
    title: "Diário Online",
    path: "/professor/diario-online",
    icon: MessageCircle,
    tooltip: "Comunique-se com seus alunos.",
  },
  top_5: {
    title: "TOP 5",
    path: "/professor/top5",
    icon: Trophy,
    tooltip: "Veja os melhores desempenhos da turma.",
  },
  gamificacao: {
    title: "Gamificação",
    path: "/professor/gamificacao",
    icon: Star,
    tooltip: "Acompanhe pontuação e conquistas dos alunos.",
  },
};

const ProfessorHome = () => {
  const { professor } = useProfessorAuth();
  const { funcionalidadesOrdenadas, isFeatureEnabled, isLoading: isLoadingFeatures } = useProfessorFeatures();
  const { config: videoConfig, modalAberto, dispensar, abrirModal } = useJarvisVideoInstrucao();

  const emptyBreadcrumbs = useMemo(() => [], []);
  useBreadcrumbs(emptyBreadcrumbs);

  const primeiroNome = professor?.nome_completo?.split(" ")[0] || "Professor";
  const turmaCode = professor?.turma_nome || "professor";

  const menuItems = useMemo(() => {
    return funcionalidadesOrdenadas
      .map((f) => {
        const config = CHAVE_CONFIG[f.chave];
        if (!config) return null;
        return {
          title: config.title,
          path: config.path,
          icon: config.icon,
          tooltip: config.tooltip,
          showAlways: true as const,
        };
      })
      .filter((item) => item !== null);
  }, [funcionalidadesOrdenadas]);

  // Quando o Jarvis Corretor é o único card de navegação liberado, ele vira a tela padrão do professor
  // (ignora funcionalidades "ambiente" sem card próprio, como calendário, jarvis chat, ajuda rápida etc.)
  const apenasJarvisCorrecao =
    !isLoadingFeatures &&
    menuItems.length === 1 &&
    menuItems[0]?.path === CHAVE_CONFIG.jarvis_correcao.path;

  // Tela padrão dedicada ao Jarvis Corretor (sem o dashboard de cards), preservando o vídeo de orientação
  if (apenasJarvisCorrecao) {
    return (
      <>
        {videoConfig && (
          <JarvisVideoModal
            aberto={modalAberto}
            titulo={videoConfig.titulo}
            urlYoutube={videoConfig.url_youtube}
            onAssistirDepois={dispensar}
          />
        )}
        <ProfessorJarvisCorrecao />
      </>
    );
  }

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-violet-100 pb-20">
        <StudentHeader />

        {videoConfig && (
          <JarvisVideoModal
            aberto={modalAberto}
            titulo={videoConfig.titulo}
            urlYoutube={videoConfig.url_youtube}
            onAssistirDepois={dispensar}
          />
        )}

        <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-8 flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-800">
              Olá, {primeiroNome}!
            </h1>
            {videoConfig && !modalAberto && (
              <button
                type="button"
                onClick={abrirModal}
                className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium text-violet-700 bg-violet-100 hover:bg-violet-200 border border-violet-200 transition-colors shadow-sm"
              >
                <PlayCircle className="w-4 h-4" />
                Assistir vídeo de orientação
              </button>
            )}
          </div>

          {isFeatureEnabled('calendario') && (
            <div className="max-w-5xl mx-auto mb-8">
              <CalendarioAtividades turmaCode={turmaCode} />
            </div>
          )}

          <div className="max-w-5xl mx-auto mb-8">
            <MuralAvisos turmaCode={turmaCode} />
          </div>

          <ProfessorMenuGrid menuItems={menuItems} />
        </main>

        <ProfessorBottomNavigation />
      </div>
    </TooltipProvider>
  );
};

export default ProfessorHome;
