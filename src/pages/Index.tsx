
import { Card, CardContent } from "@/components/ui/card";
import { BookOpen, FileText, Video, ClipboardCheck, Send, File } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useStudentAuth } from "@/hooks/useStudentAuth";
import { TooltipProvider } from "@/components/ui/tooltip";
import { MinhasRedacoes } from "@/components/MinhasRedacoes";
import { SimuladoAtivo } from "@/components/SimuladoAtivo";
import { MeusSimuladosFixo } from "@/components/MeusSimuladosFixo";
import { StudentHeader } from "@/components/StudentHeader";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { MenuGrid } from "@/components/MenuGrid";

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
        <div className="min-h-screen bg-gradient-to-br from-purple-50 to-violet-100">
          {/* Header com botão Sair */}
          <StudentHeader />

          {/* Main Content */}
          <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
            {/* Logo e Saudação Centralizada */}
            <div className="text-center mb-12">
              <div className="flex justify-center mb-6">
                <img src="/lovable-uploads/d073fb44-8fd6-46e0-9ca1-f74baca3bb5b.png" alt="App do Redator" className="h-20 w-auto" />
              </div>
              
              <h1 className="text-3xl font-bold text-redator-primary mb-4 leading-relaxed">
                Bem-vindo ao App do Redator
              </h1>
              
              {studentData.userType && (
                <p className="text-lg text-redator-accent font-medium mb-2">
                  Olá, {studentData.nomeUsuario}!
                </p>
              )}
              
              <p className="text-xl text-redator-accent font-medium mb-8">Redação na prática, aprovação na certa!</p>
            </div>

            {/* Simulado Ativo - SEMPRE em destaque no topo */}
            <SimuladoAtivo turmaCode={turmaCode} />

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
              showMinhasRedacoes={showMinhasRedacoes} 
            />
          </main>
        </div>
      </TooltipProvider>
    </ProtectedRoute>
  );
};

export default Index;
