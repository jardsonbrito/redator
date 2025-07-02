
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
        <div className="min-h-screen bg-gradient-to-br from-purple-100 via-pink-50 to-orange-50">
          {/* Header com botão Sair */}
          <StudentHeader />

          {/* Main Content */}
          <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {/* Hero Section com personagem estudantil */}
            <div className="text-center mb-12">
              {/* Ilustração principal com estudante */}
              <div className="relative mb-8">
                <div className="mx-auto max-w-md">
                  {/* Fundo ilustrativo */}
                  <div className="relative bg-gradient-to-br from-purple-200 to-orange-200 rounded-3xl p-8 shadow-xl">
                    {/* Personagem estudante */}
                    <div className="flex items-center justify-center mb-6">
                      <div className="relative">
                        {/* Avatar circular com gradiente */}
                        <div className="w-20 h-20 bg-gradient-to-br from-purple-400 to-purple-600 rounded-full flex items-center justify-center shadow-lg">
                          <div className="w-16 h-16 bg-gradient-to-br from-orange-300 to-yellow-400 rounded-full flex items-center justify-center">
                            <span className="text-2xl">👨‍🎓</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Elementos decorativos educacionais */}
                    <div className="absolute top-4 left-4">
                      <div className="w-10 h-10 bg-purple-300 rounded-xl flex items-center justify-center shadow-md">
                        <BookOpen className="w-5 h-5 text-purple-700" />
                      </div>
                    </div>
                    <div className="absolute top-4 right-4">
                      <div className="w-10 h-10 bg-blue-300 rounded-xl flex items-center justify-center shadow-md">
                        <span className="text-lg">🌍</span>
                      </div>
                    </div>
                    
                    {/* Mesa/ambiente de estudo */}
                    <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-3/4 h-6 bg-gradient-to-r from-yellow-300 to-orange-300 rounded-t-xl"></div>
                  </div>
                </div>
              </div>
              
              {/* Título com logo */}
              <div className="space-y-4">
                <div className="flex justify-center mb-4">
                  <img 
                    src="/lovable-uploads/d073fb44-8fd6-46e0-9ca1-f74baca3bb5b.png" 
                    alt="App do Redator" 
                    className="h-12 w-auto" 
                  />
                </div>
                
                {/* Badge da turma */}
                {studentData.userType && (
                  <div className="inline-flex items-center gap-2 bg-white rounded-full px-4 py-2 shadow-lg border border-purple-200">
                    <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                    <p className="text-sm font-semibold text-purple-700">
                      {studentData.userType === "aluno" && studentData.turma ? 
                        `Aluno da ${studentData.turma}` : 
                        "Visitante"
                      }
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
