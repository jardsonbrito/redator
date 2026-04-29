import { useMemo } from "react";
import {
  BookOpen, FileText, Video, GraduationCap, Library,
  Map, Layers, Bot, ClipboardCheck, NotebookPen,
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

const menuItems = [
  {
    title: "Jarvis",
    path: "/professor/jarvis-correcao",
    icon: Bot,
    tooltip: "Correção inteligente de redações com IA — agrupe seus alunos e analise os textos.",
    showAlways: true,
  },
  {
    title: "Temas",
    path: "/professor/temas",
    icon: BookOpen,
    tooltip: "Explore propostas de redação organizadas por eixo temático.",
    showAlways: true,
  },
  {
    title: "Guia Temático",
    path: "/professor/guia-tematico",
    icon: Map,
    tooltip: "Percorra um roteiro completo de aprofundamento sobre a frase temática.",
    showAlways: true,
  },
  {
    title: "Simulados",
    path: "/professor/simulados",
    icon: ClipboardCheck,
    tooltip: "Participe de simulados com horário controlado e correção detalhada.",
    showAlways: true,
  },
  {
    title: "Exercícios",
    path: "/professor/exercicios",
    icon: NotebookPen,
    tooltip: "Pratique com exercícios direcionados.",
    showAlways: true,
  },
  {
    title: "Redações Exemplares",
    path: "/professor/redacoes",
    icon: FileText,
    tooltip: "Veja textos nota 1000 e aprenda estratégias eficazes.",
    showAlways: true,
  },
  {
    title: "Redações Comentadas",
    path: "/professor/redacoes-comentadas",
    icon: RedacoesComentadasIcon as any,
    tooltip: "Analise redações com comentários detalhados e anotações por trecho.",
    showAlways: true,
  },
  {
    title: "Videoteca",
    path: "/professor/videoteca",
    icon: Video,
    tooltip: "Acesse vídeos para enriquecer o repertório sociocultural.",
    showAlways: true,
  },
  {
    title: "Aulas Gravadas",
    path: "/professor/aulas",
    icon: GraduationCap,
    tooltip: "Acesse aulas organizadas por competência.",
    showAlways: true,
  },
  {
    title: "Aulas ao Vivo",
    path: "/professor/salas-virtuais",
    icon: Video,
    tooltip: "Participe de aulas ao vivo com registro de frequência.",
    showAlways: true,
  },
  {
    title: "Microaprendizagem",
    path: "/professor/microaprendizagem",
    icon: Layers,
    tooltip: "Conteúdos rápidos em vídeo, áudio, quiz e mais.",
    showAlways: true,
  },
  {
    title: "Repertório Orientado",
    path: "/professor/repertorio",
    icon: Library,
    tooltip: "Publique parágrafos com repertório e receba feedback dos colegas.",
    showAlways: true,
  },
  {
    title: "Biblioteca",
    path: "/professor/biblioteca",
    icon: Library,
    tooltip: "Acesse materiais em PDF organizados por competência.",
    showAlways: true,
  },
];

const ProfessorHome = () => {
  const { professor } = useProfessorAuth();

  const emptyBreadcrumbs = useMemo(() => [], []);
  useBreadcrumbs(emptyBreadcrumbs);

  const primeiroNome = professor?.nome_completo?.split(" ")[0] || "Professor";
  const turmaCode = professor?.turma_nome || "professor";

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

          <MenuGrid menuItems={menuItems} showMinhasRedacoes={false} maxCards={6} />
        </main>

        <ProfessorBottomNavigation />
      </div>
    </TooltipProvider>
  );
};

export default ProfessorHome;
