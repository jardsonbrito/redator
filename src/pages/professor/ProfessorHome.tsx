
import { useMemo } from "react";
import { Link } from "react-router-dom";
import { StudentHeader } from "@/components/StudentHeader";
import { MenuGrid } from "@/components/MenuGrid";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { useProfessorAuth } from "@/hooks/useProfessorAuth";
import { useBreadcrumbs } from "@/hooks/useBreadcrumbs";
import {
  BookOpen,
  FileText,
  Video,
  GraduationCap,
  Library,
  Map,
  Layers,
  Users,
  Bell,
  UserPlus,
  Bot,
  ClipboardList,
} from "lucide-react";
import { RedacoesComentadasIcon } from "@/components/icons/RedacoesComentadasIcon";

const contentMenuItems = [
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
    icon: RedacoesComentadasIcon as any,
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
    title: "Aulas Gravadas",
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

const professorTools = [
  { title: "Minhas Turmas", path: "/professor/turmas", icon: GraduationCap },
  { title: "Meus Alunos", path: "/professor/alunos", icon: Users },
  { title: "Jarvis Correção", path: "/professor/jarvis-correcao", icon: Bot },
  { title: "Simulados", path: "/professor/simulados", icon: ClipboardList },
  { title: "Avisos", path: "/professor/avisos", icon: Bell },
  { title: "Visitantes", path: "/professor/visitantes", icon: UserPlus },
];

const ProfessorHome = () => {
  const { professor } = useProfessorAuth();

  // Impede que o breadcrumb automático gere "Início > Início" no dashboard
  const emptyBreadcrumbs = useMemo(() => [], []);
  useBreadcrumbs(emptyBreadcrumbs);

  const primeiroNome = professor?.nome_completo?.split(' ')[0] || 'Professor';

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-violet-100 pb-8">
        <StudentHeader />

        <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Saudação */}
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-gray-800">
              Olá, Prof. {primeiroNome}!
            </h1>
            {professor?.turma_nome && (
              <p className="text-sm text-gray-500 mt-1">
                Turma: <span className="font-medium">{professor.turma_nome}</span>
              </p>
            )}
          </div>

          {/* Ferramentas exclusivas do professor */}
          <div className="mb-8">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
              Ferramentas do Professor
            </h2>
            <div className="flex flex-wrap gap-2">
              {professorTools.map((tool) => (
                <Link key={tool.path} to={tool.path}>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex items-center gap-2 bg-white hover:bg-primary hover:text-white transition-colors"
                  >
                    <tool.icon className="w-4 h-4" />
                    {tool.title}
                  </Button>
                </Link>
              ))}
            </div>
          </div>

          {/* Conteúdo herdado do app */}
          <div className="mb-4">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
              Conteúdo do App
            </h2>
          </div>
          <MenuGrid menuItems={contentMenuItems} showMinhasRedacoes={false} />
        </main>
      </div>
    </TooltipProvider>
  );
};

export default ProfessorHome;
