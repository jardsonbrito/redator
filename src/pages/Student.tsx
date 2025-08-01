
import { StudentHeader } from "@/components/StudentHeader";
import { MenuGrid } from "@/components/MenuGrid";
import { MinhasRedacoes } from "@/components/MinhasRedacoes";
import { AjudaRapidaAlunoCard } from "@/components/ajuda-rapida/AjudaRapidaAlunoCard";
import { TooltipProvider } from "@/components/ui/tooltip";
import { BookOpen, FileText, Video, ClipboardCheck, Send, File, GraduationCap, NotebookPen, Trophy, MessageSquare } from "lucide-react";

const Student = () => {
  const menuItems = [
    // Linha 1, Coluna 1: Temas
    {
      title: "Temas",
      path: "/temas",
      icon: BookOpen,
      tooltip: "Explore propostas de redação organizadas por eixo temático.",
      showAlways: true,
      resourceType: "temas"
    },
    // Linha 1, Coluna 2: Redações Exemplares
    {
      title: "Redações Exemplares",
      path: "/redacoes",
      icon: FileText,
      tooltip: "Veja textos nota 1000 e aprenda estratégias eficazes.",
      showAlways: true
    },
    // Linha 2, Coluna 1: Exercícios
    {
      title: "Exercícios",
      path: "/exercicios", 
      icon: NotebookPen,
      tooltip: "Pratique com exercícios direcionados.",
      showAlways: true
    },
    // Linha 2, Coluna 2: Enviar Redação - Tema Livre
    {
      title: "Enviar Redação",
      path: "/envie-redacao",
      icon: Send,
      tooltip: "Submeta seu texto para correção detalhada.",
      showAlways: true
    },
    // Linha 3, Coluna 1: Biblioteca
    {
      title: "Biblioteca",
      path: "/biblioteca",
      icon: File,
      tooltip: "Acesse materiais em PDF organizados por competência.",
      showAlways: true
    },
    // Linha 3, Coluna 2: Videoteca
    {
      title: "Videoteca",
      path: "/videoteca",
      icon: Video,
      tooltip: "Acesse vídeos para enriquecer seu repertório sociocultural.",
      showAlways: true
    },
    // Linha 4, Coluna 1: Aulas Gravadas
    {
      title: "Aulas",
      path: "/aulas",
      icon: GraduationCap,
      tooltip: "Acesse aulas organizadas por competência.",
      showAlways: true
    },
    // Linha 4, Coluna 2: Aulas ao Vivo
    {
      title: "Aulas ao Vivo",
      path: "/aulas-ao-vivo",
      icon: Video,
      tooltip: "Participe das aulas ao vivo e registre sua frequência.",
      showAlways: true
    },
    // Linha 5, Coluna 1: Ajuda Rápida
    {
      title: "Ajuda Rápida",
      path: "/ajuda-rapida",
      icon: MessageSquare,
      tooltip: "Converse com seus corretores.",
      showAlways: true
    },
    // Linha 5, Coluna 2: Minhas Redações
    {
      title: "Minhas Redações",
      path: "/minhas-redacoes",
      icon: FileText,
      tooltip: "Visualize suas redações enviadas e corrigidas.",
      showAlways: true
    },
    // Linha 6, Coluna 1: Top 5
    {
      title: "Top 5",
      path: "/top5",
      icon: Trophy,
      tooltip: "Veja o ranking dos melhores desempenhos em redações.",
      showAlways: true
    },
    // Linha 6, Coluna 2: Simulados
    {
      title: "Simulados",
      path: "/simulados",
      icon: ClipboardCheck,
      tooltip: "Participe de simulados com horário controlado e correção detalhada.",
      showAlways: true
    }
  ];

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-violet-100">
        <StudentHeader />
        <main className="container mx-auto px-4 py-8">
          <div className="space-y-8">
            {/* Cards do painel fixos */}
            <div className="max-w-5xl mx-auto space-y-4">
              <MinhasRedacoes />
              <AjudaRapidaAlunoCard />
            </div>
            
            {/* Grid de menus na ordem correta */}
            <MenuGrid menuItems={menuItems} showMinhasRedacoes={true} />
          </div>
        </main>
      </div>
    </TooltipProvider>
  );
};

export default Student;
