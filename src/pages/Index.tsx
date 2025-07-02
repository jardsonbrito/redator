
import { Card, CardContent } from "@/components/ui/card";
import { BookOpen, FileText, Video, ClipboardCheck, Send, File, GraduationCap, NotebookPen } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useStudentAuth } from "@/hooks/useStudentAuth";
import { TooltipProvider } from "@/components/ui/tooltip";
import { MinhasRedacoes } from "@/components/MinhasRedacoes";
import { SimuladoAtivo } from "@/components/SimuladoAtivo";
import { MeusSimuladosFixo } from "@/components/MeusSimuladosFixo";
import { StudentHeader } from "@/components/StudentHeader";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { MenuGrid } from "@/components/MenuGrid";
import { MuralAvisos } from "@/components/MuralAvisos";

const Index = () => {
  const { isAdmin, user } = useAuth();
  const { studentData } = useStudentAuth();
  
  // Determina a turma/código do usuário
  let turmaCode = "Visitante";
  if (studentData.userType === "aluno" && studentData.turma) {
    turmaCode = studentData.turma;
  }

  const menuItems = [
    {
      title: "Temas",
      path: "/temas",
      icon: BookOpen,
      tooltip: "Explore propostas de redação organizadas por eixo temático.",
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
      title: "Biblioteca",
      path: "/biblioteca",
      icon: File,
      tooltip: "Acesse materiais em PDF organizados por competência.",
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
      title: "Aulas",
      path: "/aulas",
      icon: GraduationCap,
      tooltip: "Acesse aulas organizadas por competência.",
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
      title: "Enviar Redação (Avulsa)",
      path: "/envie-redacao",
      icon: Send,
      tooltip: "Submeta seu texto para correção detalhada.",
      showAlways: true
    }
  ];

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
            {/* Seção limpa com logo e badge da turma */}
            <div className="text-center mb-12">
              {/* Logo em destaque */}
              <div className="flex justify-center mb-6">
                <img 
                  src="/lovable-uploads/d073fb44-8fd6-46e0-9ca1-f74baca3bb5b.png" 
                  alt="App do Redator" 
                  className="h-20 w-auto" 
                />
              </div>
              
              {/* Badge da turma */}
              {studentData.userType && (
                <div className="inline-flex items-center gap-2 bg-white rounded-full px-4 py-2 shadow-lg border border-secondary">
                  <div className="w-2 h-2 bg-primary rounded-full"></div>
                  <p className="text-sm font-semibold text-primary">
                    {studentData.userType === "aluno" && studentData.turma ? 
                      `Aluno da ${studentData.turma}` : 
                      "Visitante"
                    }
                  </p>
                </div>
              )}
            </div>

            {/* Simulado Ativo - SEMPRE em destaque no topo */}
            <SimuladoAtivo turmaCode={turmaCode} />

            {/* Mural de Avisos */}
            <MuralAvisos turmaCode={turmaCode} />

            {/* Seção "Minhas Redações" - apenas para alunos de turma */}
            {showMinhasRedacoes && (
              <div className="mb-8">
                <MinhasRedacoes />
              </div>
            )}

            {/* Card "Meus Simulados" - SEMPRE FIXO E VISÍVEL */}
            <MeusSimuladosFixo turmaCode={turmaCode} />

            {/* Menu Principal Horizontal */}
            <MenuGrid 
              menuItems={menuItems} 
              showMinhasRedacoes={!!showMinhasRedacoes} 
            />
          </main>
        </div>
      </TooltipProvider>
    </ProtectedRoute>
  );
};

export default Index;
