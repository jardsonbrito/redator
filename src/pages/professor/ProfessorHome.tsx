import { useMemo } from "react";
import {
  BookOpen, FileText, Video, GraduationCap, Library,
  Map, Layers, Bot, ClipboardCheck, NotebookPen,
  MessageCircle, Trophy, Star,
} from "lucide-react";
import { RedacoesComentadasIcon } from "@/components/icons/RedacoesComentadasIcon";
import { TooltipProvider } from "@/components/ui/tooltip";
import { StudentHeader } from "@/components/StudentHeader";
import { MenuGrid } from "@/components/MenuGrid";
import { CalendarioAtividades } from "@/components/CalendarioAtividades";
import { MuralAvisos } from "@/components/MuralAvisos";
import { ProfessorBottomNavigation } from "@/components/professor/ProfessorBottomNavigation";
import { useProfessorAuth } from "@/hooks/useProfessorAuth";
import { useBreadcrumbs } from "@/hooks/useBreadcrumbs";
import { useProfessorFeatures } from "@/hooks/useProfessorFeatures";

const CHAVE_CONFIG: Record<string, { title: string; path: string; icon: any; tooltip: string }> = {
  jarvis_correcao: {
    title: "Jarvis",
    path: "/professor/jarvis-correcao",
    icon: Bot,
    tooltip: "Correção inteligente de redações com IA — agrupe seus alunos e analise os textos.",
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
  const { funcionalidadesOrdenadas } = useProfessorFeatures();

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

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-violet-100 pb-20">
        <StudentHeader />

        <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-gray-800">
              Olá, {primeiroNome}!
            </h1>
          </div>

          <div className="max-w-5xl mx-auto mb-8">
            <CalendarioAtividades turmaCode={turmaCode} />
          </div>

          <div className="max-w-5xl mx-auto mb-8">
            <MuralAvisos turmaCode={turmaCode} />
          </div>

          <MenuGrid menuItems={menuItems} showMinhasRedacoes={false} />
        </main>

        <ProfessorBottomNavigation />
      </div>
    </TooltipProvider>
  );
};

export default ProfessorHome;
