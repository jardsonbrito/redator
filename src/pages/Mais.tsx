import { StudentHeader } from "@/components/StudentHeader";
import { BottomNavigation } from "@/components/BottomNavigation";
import { MenuGrid } from "@/components/MenuGrid";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { useStudentAuth } from "@/hooks/useStudentAuth";
import { useProcessoSeletivo } from "@/hooks/useProcessoSeletivo";
import { TooltipProvider } from "@/components/ui/tooltip";
import { BookOpen, FileText, Video, ClipboardCheck, Send, File, GraduationCap, NotebookPen, Trophy, Presentation, Gamepad2, Calendar, ClipboardList, Library, Map, Bot } from "lucide-react";
import { LaboratorioIcon } from "@/components/icons/LaboratorioIcon";
import { RedacoesComentadasIcon } from "@/components/icons/RedacoesComentadasIcon";

const Mais = () => {
  const { studentData } = useStudentAuth();
  const {
    elegivel: elegivelProcessoSeletivo,
    pendentePreencher,
  } = useProcessoSeletivo(studentData.email || '');

  // Verifica se o aluno está participando do processo seletivo
  const participandoProcessoSeletivo = elegivelProcessoSeletivo && studentData.userType === 'aluno';

  // Card de Processo Seletivo
  const processoSeletivoCard = {
    title: "Processo Seletivo",
    path: "/processo-seletivo",
    icon: ClipboardList,
    tooltip: pendentePreencher
      ? "Complete sua inscrição no processo seletivo de bolsas!"
      : "Participe do processo seletivo de bolsas.",
    showAlways: false,
    showCondition: participandoProcessoSeletivo,
    highlight: pendentePreencher
  };

  // Cards padrão do menu
  const baseMenuItems = [
    {
      title: "Jarvis",
      path: "/jarvis",
      icon: Bot,
      tooltip: "Assistente pedagógico para melhorar sua escrita - 1 crédito por análise.",
      showAlways: true
    },
    {
      title: "Temas",
      path: "/temas",
      icon: BookOpen,
      tooltip: "Explore propostas de redação organizadas por eixo temático.",
      showAlways: true
    },
    {
      title: "Guia Temático",
      path: "/guia-tematico",
      icon: Map,
      tooltip: "Percorra um roteiro completo de aprofundamento sobre a frase temática.",
      showAlways: true
    },
    {
      title: "Simulados",
      path: "/simulados",
      icon: ClipboardCheck,
      tooltip: "Participe de simulados com horário controlado e correção detalhada.",
      showAlways: true
    },
    {
      title: "Exercícios",
      path: "/exercicios",
      icon: NotebookPen,
      tooltip: "Pratique com exercícios direcionados.",
      showAlways: true
    },
    {
      title: "Lousa",
      path: "/lousa",
      icon: Presentation,
      tooltip: "Participe de exercícios rápidos criados pelos professores.",
      showAlways: true
    },
    {
      title: "Repertório Orientado",
      path: "/repertorio-orientado",
      icon: Library,
      tooltip: "Publique parágrafos com repertório e receba feedback dos colegas e professores.",
      showAlways: true
    },
    {
      title: "Laboratório de Repertório",
      path: "/laboratorio-repertorio",
      icon: LaboratorioIcon as any,
      tooltip: "Aulas em 3 etapas: Contexto → Repertório → Aplicação.",
      showAlways: true
    },
    {
      title: studentData.userType === "aluno" ? "Enviar Redação – Tema Livre" : "Enviar Redação Avulsa – Tema Livre",
      path: "/envie-redacao",
      icon: Send,
      tooltip: "Submeta seu texto sobre tema livre para correção detalhada.",
      showAlways: true
    },
    {
      title: "Redações Exemplares",
      path: "/redacoes",
      icon: FileText,
      tooltip: "Veja textos nota 1000 e aprenda estratégias eficazes.",
      showAlways: true
    },
    {
      title: "Redações Comentadas",
      path: "/redacoes-comentadas",
      icon: RedacoesComentadasIcon as any,
      tooltip: "Analise redações com comentários detalhados e anotações por trecho.",
      showAlways: true
    },
    {
      title: "Videoteca",
      path: "/videoteca",
      icon: Video,
      tooltip: "Acesse vídeos para enriquecer seu repertório sociocultural.",
      showAlways: true
    },
    {
      title: "Aulas Gravadas",
      path: "/aulas",
      icon: GraduationCap,
      tooltip: "Acesse aulas organizadas por competência.",
      showAlways: true
    },
    {
      title: "Aulas ao Vivo",
      path: "/aulas-ao-vivo",
      icon: Video,
      tooltip: "Participe de aulas ao vivo com registro de frequência.",
      showAlways: true
    },
    {
      title: "Top 5",
      path: "/top5",
      icon: Trophy,
      tooltip: "Veja o ranking dos melhores desempenhos em redações.",
      showAlways: true
    },
    {
      title: "Biblioteca",
      path: "/biblioteca",
      icon: File,
      tooltip: "Acesse materiais em PDF organizados por competência.",
      showAlways: true
    },
    {
      title: "Minhas Redações",
      path: "/minhas-redacoes",
      icon: FileText,
      tooltip: "Acompanhe todas as suas redações corrigidas com segurança.",
      showAlways: true
    },
    {
      title: "Diário Online",
      path: "/diario-online",
      icon: Calendar,
      tooltip: "Visualize seu desempenho acadêmico dividido por etapas do ano letivo.",
      showAlways: true
    },
    {
      title: "Gamificação",
      path: "/gamificacao",
      icon: Gamepad2,
      tooltip: "Participe de jogos educativos para treinar redação.",
      showAlways: true
    },
    {
      title: "Microaprendizagem",
      path: "/microaprendizagem",
      icon: BookOpen,
      tooltip: "Conteúdos rápidos em vídeo, áudio, quiz e mais para aprender no seu ritmo.",
      showAlways: true
    }
  ];

  // Se o aluno está participando do processo seletivo, colocar o card primeiro
  const menuItems = participandoProcessoSeletivo
    ? [processoSeletivoCard, ...baseMenuItems]
    : baseMenuItems;

  // Determinar se deve mostrar seção "Minhas Redações"
  const showMinhasRedacoes = (studentData.userType === "aluno" && studentData.turma) || studentData.userType === "visitante";

  return (
    <ProtectedRoute>
      <TooltipProvider>
        <div className="min-h-screen bg-gradient-to-br from-secondary/20 via-secondary/10 to-secondary/5 pb-20">
          <StudentHeader />

          <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {/* Título da página */}
            <div className="mb-8">
              <h1 className="text-2xl font-bold text-gray-800">
                Todos os Recursos
              </h1>
              <p className="text-sm text-gray-600 mt-2">
                {menuItems.length} recursos disponíveis
              </p>
            </div>

            <MenuGrid
              menuItems={menuItems}
              showMinhasRedacoes={!!showMinhasRedacoes}
            />
          </main>

          <BottomNavigation />
        </div>
      </TooltipProvider>
    </ProtectedRoute>
  );
};

export default Mais;
