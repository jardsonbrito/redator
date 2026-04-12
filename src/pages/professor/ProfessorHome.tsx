
import { Link } from "react-router-dom";
import { StudentHeader } from "@/components/StudentHeader";
import { TooltipProvider, Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  BookOpen,
  FileText,
  Video,
  GraduationCap,
  Library,
  Map,
  BookMarked,
  Layers,
} from "lucide-react";

const menuItems = [
  {
    title: "Temas",
    path: "/professor/temas",
    icon: BookOpen,
    tooltip: "Explore propostas de redação organizadas por eixo temático.",
  },
  {
    title: "Redações Exemplares",
    path: "/professor/redacoes",
    icon: FileText,
    tooltip: "Veja textos nota 1000 e aprenda estratégias eficazes.",
  },
  {
    title: "Guia Temático",
    path: "/professor/guia-tematico",
    icon: Map,
    tooltip: "Explore o guia temático com artigos e análises.",
  },
  {
    title: "Repertório Orientado",
    path: "/professor/repertorio",
    icon: BookMarked,
    tooltip: "Publique parágrafos com repertório e receba feedback dos colegas.",
  },
  {
    title: "Videoteca",
    path: "/professor/videoteca",
    icon: Video,
    tooltip: "Acesse vídeos para enriquecer o repertório sociocultural.",
  },
  {
    title: "Aulas",
    path: "/professor/aulas",
    icon: GraduationCap,
    tooltip: "Acesse aulas organizadas por competência.",
  },
  {
    title: "Aulas ao Vivo",
    path: "/professor/salas-virtuais",
    icon: Video,
    tooltip: "Acesse e gerencie salas virtuais de aulas ao vivo.",
  },
  {
    title: "Biblioteca",
    path: "/professor/biblioteca",
    icon: Library,
    tooltip: "Acesse materiais em PDF organizados por competência.",
  },
  {
    title: "Microaprendizagem",
    path: "/professor/microaprendizagem",
    icon: Layers,
    tooltip: "Conteúdos rápidos em vídeo, áudio, quiz e mais.",
  },
];

const ProfessorHome = () => {
  return (
    <TooltipProvider>
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-violet-100">
        <StudentHeader />
        <main className="container mx-auto px-4 py-8">
          <div className="max-w-5xl mx-auto">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {menuItems.map((item) => (
                <Tooltip key={item.path}>
                  <TooltipTrigger asChild>
                    <Link
                      to={item.path}
                      className="flex flex-col items-center gap-3 p-5 rounded-2xl bg-white/80 border border-primary/10 shadow-sm hover:shadow-md hover:bg-white hover:border-primary/20 transition-all duration-200 group"
                    >
                      <div className="p-3 rounded-xl bg-gradient-to-br from-primary/10 to-accent/10 group-hover:from-primary/20 group-hover:to-accent/20 transition-all duration-200">
                        <item.icon className="w-6 h-6 text-primary group-hover:text-accent transition-colors duration-200" />
                      </div>
                      <span className="text-sm font-medium text-center text-foreground group-hover:text-primary transition-colors duration-200 leading-tight">
                        {item.title}
                      </span>
                    </Link>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="max-w-xs text-xs">{item.tooltip}</p>
                  </TooltipContent>
                </Tooltip>
              ))}
            </div>
          </div>
        </main>
      </div>
    </TooltipProvider>
  );
};

export default ProfessorHome;
