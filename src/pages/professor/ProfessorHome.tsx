
import { StudentHeader } from "@/components/StudentHeader";
import { MenuGrid } from "@/components/MenuGrid";
import { TooltipProvider } from "@/components/ui/tooltip";
import {
  BookOpen,
  FileText,
  MessageSquare,
  Video,
  GraduationCap,
  Library,
  Map,
  Layers,
} from "lucide-react";

const menuItems = [
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
    tooltip: "Explore o guia temático com artigos e análises.",
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
    icon: MessageSquare,
    tooltip: "Redações com comentários detalhados e anotações por trecho.",
    showAlways: true,
  },
  {
    title: "Aulas ao Vivo",
    path: "/professor/salas-virtuais",
    icon: Video,
    tooltip: "Participe das aulas ao vivo e registre sua presença.",
    showAlways: true,
  },
  {
    title: "Aulas",
    path: "/professor/aulas",
    icon: GraduationCap,
    tooltip: "Acesse aulas organizadas por competência.",
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
    title: "Microaprendizagem",
    path: "/professor/microaprendizagem",
    icon: Layers,
    tooltip: "Conteúdos rápidos em vídeo, áudio, quiz e mais.",
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
  return (
    <TooltipProvider>
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-violet-100">
        <StudentHeader />
        <main className="container mx-auto px-4 py-8">
          <MenuGrid menuItems={menuItems} showMinhasRedacoes={false} />
        </main>
      </div>
    </TooltipProvider>
  );
};

export default ProfessorHome;
