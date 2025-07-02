
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

  // Determinar se deve mostrar seção "Minhas Redações"
  const showMinhasRedacoes = studentData.userType === "aluno" && studentData.turma;

  return (
    <ProtectedRoute>
      <TooltipProvider>
        <div className="min-h-screen bg-gradient-to-br from-violet-50 via-purple-50 to-indigo-50">
          {/* Header com botão Sair */}
          <StudentHeader />

          {/* Main Content */}
          <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            {/* Logo e Saudação Centralizada */}
            <div className="text-center mb-10">
              <div className="flex justify-center mb-8">
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-primary to-secondary rounded-full blur-2xl opacity-20 scale-150"></div>
                  <img 
                    src="/lovable-uploads/d073fb44-8fd6-46e0-9ca1-f74baca3bb5b.png" 
                    alt="App do Redator" 
                    className="h-24 w-auto relative z-10 drop-shadow-lg" 
                  />
                </div>
              </div>
              
              <div className="space-y-4">
                <h1 className="text-4xl md:text-5xl font-extrabold bg-gradient-to-r from-primary via-accent to-secondary bg-clip-text text-transparent leading-tight">
                  App do Redator
                </h1>
                
                <div className="flex items-center justify-center gap-2 text-2xl font-bold text-primary/80">
                  <span>✨</span>
                  <span>Redação na prática, aprovação na certa!</span>
                  <span>🚀</span>
                </div>
                
                {studentData.userType && (
                  <div className="bg-white/60 backdrop-blur-sm rounded-2xl px-6 py-3 inline-block shadow-lg border border-white/40">
                    <p className="text-lg font-semibold text-accent">
                      {studentData.userType === "aluno" ? "🎓" : "👋"} {studentData.nomeUsuario}
                    </p>
                  </div>
                )}
              </div>
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
