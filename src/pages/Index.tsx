import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { BookOpen, FileText, Video, ClipboardCheck, Send, File, GraduationCap, NotebookPen, Trophy, MessageSquare, Presentation, Gamepad2, Calendar, ClipboardList, AlertCircle, MessageSquareText } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { useAuth } from "@/hooks/useAuth";
import { useStudentAuth } from "@/hooks/useStudentAuth";
import { useProcessoSeletivo } from "@/hooks/useProcessoSeletivo";
import { TooltipProvider } from "@/components/ui/tooltip";
import { StudentHeader } from "@/components/StudentHeader";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { MenuGrid } from "@/components/MenuGrid";
import { MuralAvisos } from "@/components/MuralAvisos";
import { MeuDesempenho } from "@/components/MeuDesempenho";
import { StudentInboxManager } from "@/components/student/StudentInboxManager";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

const Index = () => {
  const { isAdmin, user } = useAuth();
  const { studentData } = useStudentAuth();
  const {
    elegivel: elegivelProcessoSeletivo,
    pendentePreencher,
    candidatoStatus
  } = useProcessoSeletivo(studentData.email || '');
  const navigate = useNavigate();

  // Estado para o popup de formulário pendente
  const [showPendingPopup, setShowPendingPopup] = useState(false);
  const [popupDismissed, setPopupDismissed] = useState(false);

  // Mostrar popup para candidatos que precisam preencher o formulário
  useEffect(() => {
    if (pendentePreencher && studentData.userType === 'aluno' && !popupDismissed) {
      // Verificar se já foi mostrado nesta sessão
      const sessionKey = `ps-popup-shown-${studentData.email}`;
      const alreadyShown = sessionStorage.getItem(sessionKey);

      if (!alreadyShown) {
        setShowPendingPopup(true);
        sessionStorage.setItem(sessionKey, 'true');
      }
    }
  }, [pendentePreencher, studentData.userType, studentData.email, popupDismissed]);

  const handleGoToProcessoSeletivo = () => {
    setShowPendingPopup(false);
    setPopupDismissed(true);
    navigate('/processo-seletivo');
  };

  const handleDismissPopup = () => {
    setShowPendingPopup(false);
    setPopupDismissed(true);
  };

  // Determina a turma/código do usuário
  let turmaCode = "Visitante";
  if (studentData.userType === "aluno" && studentData.turma) {
    turmaCode = studentData.turma;
  } else if (studentData.userType === "visitante") {
    turmaCode = "Visitante";
  }

  // Verifica se o aluno está participando do processo seletivo (qualquer status exceto null)
  const participandoProcessoSeletivo = elegivelProcessoSeletivo && studentData.userType === 'aluno';

  // Card de Processo Seletivo (definido separadamente para controle de posição)
  const processoSeletivoCard = {
    title: "Processo Seletivo",
    path: "/processo-seletivo",
    icon: ClipboardList,
    tooltip: pendentePreencher
      ? "Complete sua inscrição no processo seletivo de bolsas!"
      : "Participe do processo seletivo de bolsas.",
    showAlways: false,
    showCondition: participandoProcessoSeletivo,
    highlight: pendentePreencher // Destaque especial se pendente
  };

  // Cards padrão do menu
  const baseMenuItems = [
    {
      title: "Temas",
      path: "/temas",
      icon: BookOpen,
      tooltip: "Explore propostas de redação organizadas por eixo temático.",
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
      icon: MessageSquareText,
      tooltip: "Publique parágrafos com repertório e receba feedback dos colegas e professores.",
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
      title: "Ajuda Rápida",
      path: "/ajuda-rapida",
      icon: MessageSquare,
      tooltip: "Converse com seus corretores.",
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
      title: "Minhas Conquistas",
      path: "/minhas-conquistas",
      icon: Trophy,
      tooltip: "Acompanhe suas atividades por mês.",
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
    }
  ];

  // Se o aluno está participando do processo seletivo, colocar o card primeiro
  const menuItems = participandoProcessoSeletivo
    ? [processoSeletivoCard, ...baseMenuItems]
    : baseMenuItems;

  // Determinar se deve mostrar seção "Minhas Redações" - tanto para alunos quanto visitantes
  const showMinhasRedacoes = (studentData.userType === "aluno" && studentData.turma) || studentData.userType === "visitante";

  return (
    <ProtectedRoute>
      <TooltipProvider>
        <div className="min-h-screen bg-gradient-to-br from-secondary/20 via-secondary/10 to-secondary/5">
          {/* Header com botão Sair */}
          <StudentHeader />

          {/* Main Content */}
          <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {/* Seção limpa com logo */}
            <div className="text-center mb-8">
              <div className="flex justify-center mb-6">
                <img 
                  src="/lovable-uploads/d073fb44-8fd6-46e0-9ca1-f74baca3bb5b.png" 
                  alt="App do Redator" 
                  className="h-20 w-auto" 
                />
              </div>
            </div>


            {/* Cards do painel */}
            <div className="max-w-5xl mx-auto mb-8">
              <MeuDesempenho />
            </div>

            {/* Mural de Avisos */}
            <MuralAvisos turmaCode={turmaCode} />

            {/* Menu Principal Horizontal */}
            <MenuGrid
              menuItems={menuItems}
              showMinhasRedacoes={!!showMinhasRedacoes}
            />
          </main>

          {/* Gerenciador de mensagens do Inbox */}
          <StudentInboxManager />

          {/* Popup para candidatos que precisam completar o formulário do processo seletivo */}
          <Dialog open={showPendingPopup} onOpenChange={setShowPendingPopup}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-[#3F0077]">
                  <AlertCircle className="h-5 w-5" />
                  Complete sua Inscrição
                </DialogTitle>
                <DialogDescription className="text-base pt-2">
                  Você iniciou sua inscrição no <strong>Processo Seletivo de Bolsas</strong>, mas ainda não preencheu o formulário completo.
                </DialogDescription>
              </DialogHeader>
              <div className="py-4">
                <p className="text-sm text-muted-foreground">
                  Para participar da seleção, é necessário preencher todas as informações solicitadas no formulário. Clique no botão abaixo para continuar.
                </p>
              </div>
              <DialogFooter className="flex-col sm:flex-row gap-2">
                <Button variant="outline" onClick={handleDismissPopup}>
                  Preencher depois
                </Button>
                <Button
                  onClick={handleGoToProcessoSeletivo}
                  className="bg-[#3F0077] hover:bg-[#662F96]"
                >
                  <ClipboardList className="h-4 w-4 mr-2" />
                  Preencher Agora
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </TooltipProvider>
    </ProtectedRoute>
  );
};

export default Index;
