
import { Card, CardContent } from "@/components/ui/card";
import { BookOpen, FileText, Video, ClipboardCheck, Send, File, GraduationCap, NotebookPen, Trophy, Users } from "lucide-react";
import { AjudaRapidaCard } from "@/components/ajuda-rapida/AjudaRapidaCard";
import { useAuth } from "@/hooks/useAuth";
import { useStudentAuth } from "@/hooks/useStudentAuth";
import { TooltipProvider } from "@/components/ui/tooltip";
import { StudentHeader } from "@/components/StudentHeader";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { MenuGrid } from "@/components/MenuGrid";
import { MuralAvisos } from "@/components/MuralAvisos";
import { MeuDesempenho } from "@/components/MeuDesempenho";
import { StudentProfile } from "@/components/StudentProfile";

const Index = () => {
  const { isAdmin, user } = useAuth();
  const { studentData } = useStudentAuth();
  
  // Mapear nomes de turma para códigos corretos
  const getTurmaCode = (turmaNome: string) => {
    const turmasMap = {
      "Turma A": "LRA2025",
      "Turma B": "LRB2025", 
      "Turma C": "LRC2025",
      "Turma D": "LRD2025",
      "Turma E": "LRE2025"
    };
    return turmasMap[turmaNome as keyof typeof turmasMap] || turmaNome;
  };

  // Determina a turma/código do usuário
  let turmaCode = "Visitante";
  if (studentData.userType === "aluno" && studentData.turma) {
    turmaCode = studentData.turma; // Usar nome da turma para display, código será mapeado internamente
  } else if (studentData.userType === "visitante") {
    turmaCode = "Visitante"; // Corrigido para usar maiúscula consistente
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
      title: "Salas Virtuais",
      path: "/salas-virtuais",
      icon: Users,
      tooltip: "Acesse suas salas virtuais vinculadas à turma.",
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

            {/* Perfil do Estudante */}
            <StudentProfile />

            {/* Componente Meu Desempenho */}
            <MeuDesempenho />

            {/* Mural de Avisos */}
            <MuralAvisos turmaCode={turmaCode} />

            {/* Card Ajuda Rápida */}
            <div className="mb-8">
              <AjudaRapidaCard />
            </div>

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
