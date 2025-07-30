import { useProfessorAuth } from "@/hooks/useProfessorAuth";
import { Navigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  BookOpen, 
  FileText, 
  Video,
  ClipboardCheck,
  NotebookPen,
  MessageSquare,
  GraduationCap,
  File,
  LogOut,
  Shield,
  ShieldCheck,
  Users
} from "lucide-react";
import { Link } from "react-router-dom";

export const ProfessorDashboard = () => {
  const { professor, logout, isProfessor, isAdmin } = useProfessorAuth();

  if (!professor) {
    return <Navigate to="/professor/login" replace />;
  }

  if (professor.primeiro_login) {
    return <Navigate to="/professor/trocar-senha" replace />;
  }

  const professorMenuItems = [
    { id: "temas", label: "Temas", icon: BookOpen, path: "/temas" },
    { id: "redacoes", label: "Redações Exemplares", icon: FileText, path: "/redacoes" },
    { id: "simulados", label: "Simulados", icon: ClipboardCheck, path: "/simulados" },
    { id: "exercicios", label: "Exercícios", icon: NotebookPen, path: "/exercicios" },
    { id: "salas-virtuais", label: "Salas Virtuais", icon: Video, path: "/aulas" },
    { id: "aulas", label: "Aulas", icon: GraduationCap, path: "/aulas" },
    { id: "avisos", label: "Mural de Avisos", icon: MessageSquare, path: "/avisos" },
    { id: "biblioteca", label: "Videobiblioteca", icon: File, path: "/biblioteca" },
  ];

  const adminMenuItems = [
    ...professorMenuItems,
    { id: "redacoes-enviadas", label: "Redações Enviadas", icon: FileText, path: "/admin" },
    { id: "alunos", label: "Alunos", icon: Users, path: "/admin" },
    { id: "dashboard", label: "Painel Completo", icon: Shield, path: "/admin" },
  ];

  const menuItems = isAdmin ? adminMenuItems : professorMenuItems;

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-secondary/10">
      {/* Header */}
      <header className="bg-white/90 backdrop-blur-sm shadow-lg border-b border-primary/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-primary flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  {isAdmin ? (
                    <ShieldCheck className="w-8 h-8 text-primary" />
                  ) : (
                    <GraduationCap className="w-8 h-8 text-primary" />
                  )}
                </div>
                Painel do {isAdmin ? 'Administrador' : 'Professor'}
              </h1>
              <p className="text-muted-foreground mt-1">
                Bem-vindo, <strong>{professor.nome_completo}</strong>
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-sm font-medium text-primary">{professor.email}</p>
                <p className="text-xs text-muted-foreground capitalize">
                  {professor.role === 'admin' ? 'Administrador' : 'Professor'}
                </p>
              </div>
              <Button
                variant="outline"
                onClick={logout}
                className="text-red-600 border-red-200 hover:bg-red-50"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Sair
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-8">
          {/* Welcome Section */}
          <div className="text-center space-y-4">
            <h2 className="text-2xl font-semibold text-primary">
              Acesso às ferramentas da plataforma
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              {isAdmin 
                ? "Como administrador, você tem acesso completo a todas as funcionalidades da plataforma."
                : "Aqui você pode acessar todas as ferramentas disponíveis para professores."
              }
            </p>
          </div>

          {/* Menu Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {menuItems.map((item) => (
              <Link key={item.id} to={item.path}>
                <Card className="group cursor-pointer bg-white/80 backdrop-blur-sm hover:bg-white hover:shadow-xl hover:shadow-primary/10 transition-all duration-300 border border-primary/10 hover:border-primary/20 rounded-2xl overflow-hidden h-full">
                  <CardHeader className="p-6 text-center">
                    <div className="flex flex-col items-center gap-4">
                      <div className="p-4 bg-gradient-to-br from-primary/10 to-accent/10 rounded-xl group-hover:from-primary/20 group-hover:to-accent/20 transition-all duration-300">
                        <item.icon className="w-8 h-8 text-primary group-hover:text-accent transition-colors duration-300" />
                      </div>
                      <CardTitle className="text-lg font-semibold text-primary group-hover:text-accent transition-colors duration-300">
                        {item.label}
                      </CardTitle>
                    </div>
                  </CardHeader>
                </Card>
              </Link>
            ))}
          </div>

          {/* Quick Actions */}
          <div className="bg-white/50 backdrop-blur-sm rounded-2xl border border-primary/10 p-6">
            <h3 className="text-lg font-semibold text-primary mb-4">Ações Rápidas</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <Link to="/professor/trocar-senha">
                <Button variant="outline" className="w-full justify-start">
                  <Shield className="w-4 h-4 mr-2" />
                  Alterar Minha Senha
                </Button>
              </Link>
              
              {isAdmin && (
                <Link to="/admin">
                  <Button variant="outline" className="w-full justify-start">
                    <ShieldCheck className="w-4 h-4 mr-2" />
                    Painel Administrativo Completo
                  </Button>
                </Link>
              )}
              
              <Link to="/">
                <Button variant="outline" className="w-full justify-start">
                  <GraduationCap className="w-4 h-4 mr-2" />
                  Visualizar como Aluno
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};