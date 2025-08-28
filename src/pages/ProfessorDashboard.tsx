import { useProfessorAuth } from "@/hooks/useProfessorAuth";
import { Navigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useEffect } from "react";
import { 
  BookOpen, 
  FileText, 
  Video,
  ClipboardCheck,
  NotebookPen,
  MessageSquare,
  GraduationCap,
  Library,
  LogOut,
  Shield,
  ShieldCheck,
  Users,
  Lightbulb
} from "lucide-react";
import { Link } from "react-router-dom";
import { ProfessorAvatar } from "@/components/professor/ProfessorAvatar";

export const ProfessorDashboard = () => {
  const { professor, logout, isProfessor, isAdmin } = useProfessorAuth();

  if (!professor) {
    return <Navigate to="/professor/login" replace />;
  }

  if (professor.primeiro_login) {
    return <Navigate to="/professor/trocar-senha" replace />;
  }

  const professorMenuItems = [
    // Cards individualizados (vazios por padrão) - ordem reorganizada
    { id: "turmas", label: "Turmas", icon: Users, path: "/professor/turmas", shared: false },
    { id: "alunos", label: "Alunos", icon: GraduationCap, path: "/professor/alunos", shared: false },
    { id: "aulas", label: "Aulas", icon: BookOpen, path: "/professor/aulas", shared: false },
    { id: "salas-virtuais", label: "Salas Virtuais", icon: Video, path: "/professor/salas-virtuais", shared: false },
    { id: "exercicios", label: "Exercícios", icon: NotebookPen, path: "/professor/exercicios", shared: false },
    { id: "simulados", label: "Simulados", icon: ClipboardCheck, path: "/professor/simulados", shared: false },
    { id: "avisos", label: "Mural de Avisos", icon: MessageSquare, path: "/professor/avisos", shared: false },
    // Cards com conteúdo compartilhado
    { id: "temas", label: "Temas", icon: Lightbulb, path: "/professor/temas", shared: true },
    { id: "redacoes", label: "Redações Exemplares", icon: FileText, path: "/professor/redacoes", shared: true },
    { id: "videoteca", label: "Videoteca", icon: Video, path: "/professor/videoteca", shared: true },
    { id: "biblioteca", label: "Biblioteca", icon: Library, path: "/professor/biblioteca", shared: true },
  ];

  const adminMenuItems = [
    ...professorMenuItems,
    { id: "redacoes-enviadas", label: "Redações Enviadas", icon: FileText, path: "/admin", shared: false },
    { id: "professores", label: "Professores", icon: Shield, path: "/admin", shared: false },
    { id: "dashboard", label: "Painel Completo", icon: ShieldCheck, path: "/admin", shared: false },
  ];

  const menuItems = isAdmin ? adminMenuItems : professorMenuItems;

  // Dynamic text adjustments for mobile
  useEffect(() => {
    const timer = setTimeout(() => {
      // Ajusta título para "Administrativo"
      const title = document.querySelector(".header__title");
      if (title && title.textContent?.includes("Painel")) {
        title.textContent = "Administrativo";
      }

      // Ajusta botão voltar para "App"
      const backLabel = document.querySelector(".btn-back .label");
      if (backLabel && backLabel.textContent?.includes("Voltar")) {
        backLabel.textContent = "App";
      }

      // Saudação: apenas primeiro nome
      const greet = document.querySelector(".header__greet");
      if (greet && greet.textContent) {
        let text = greet.textContent.trim();
        if (text.toLowerCase().startsWith("olá")) {
          // Se contém email, extrair parte antes do @
          if (text.includes("@")) {
            const emailMatch = text.match(/([^@\s]+)@/);
            if (emailMatch) {
              greet.textContent = `Olá, ${emailMatch[1]}`;
            }
          } else {
            // Se não é email, pegar o primeiro nome
            const parts = text.replace(/,/g, "").split(/\s+/);
            if (parts.length > 1) {
              greet.textContent = `Olá, ${parts[1]}`;
            }
          }
        }
      }
    }, 100); // Small delay to ensure DOM is ready

    return () => clearTimeout(timer);
  }, [professor]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-secondary/10">
      {/* Header */}
      <header id="admin-header" className="bg-white/90 backdrop-blur-sm shadow-lg border-b border-primary/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="header__inner">
            <div className="header__left">
              <Link 
                to="/"
                className="btn-ghost btn-back"
                aria-label="Voltar à Web"
              >
                <GraduationCap className="icon w-5 h-5" />
                <span className="label">Voltar à Web</span>
              </Link>
            </div>

            <div className="header__center">
              <h1 className="header__title">
                Painel Administrativo
              </h1>
            </div>

            <div className="header__right">
              {/* Perfil do professor com avatar, nome e função */}
              <div className="flex items-center gap-3">
                <ProfessorAvatar size="sm" showUpload={true} />
                <div className="hidden sm:flex flex-col">
                  <span className="text-foreground font-medium text-sm">
                    {professor.nome_completo || 'Professor'}
                  </span>
                  <span className="text-muted-foreground text-xs">
                    {isAdmin ? 'Administrador' : 'Professor'}
                  </span>
                </div>
              </div>
              
              <Button
                onClick={logout}
                className="btn-exit"
                aria-label="Sair"
              >
                <LogOut className="icon w-4 h-4" />
                <span className="label">Sair</span>
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
                : "Gerencie suas turmas, alunos e conteúdos. Os cards destacados em azul mostram conteúdo compartilhado pelo administrador."
              }
            </p>
          </div>

          {/* Menu Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {menuItems.map((item) => (
              <Link key={item.id} to={item.path}>
                <Card className={`group cursor-pointer backdrop-blur-sm hover:shadow-xl transition-all duration-300 rounded-2xl overflow-hidden h-full ${
                  item.shared 
                    ? "bg-blue-50/80 border border-blue-200 hover:bg-blue-100/80 hover:shadow-blue-200/50" 
                    : "bg-white/80 border border-primary/10 hover:bg-white hover:shadow-primary/10 hover:border-primary/20"
                }`}>
                  <CardHeader className="p-6 text-center">
                    <div className="flex flex-col items-center gap-4">
                      <div className={`p-4 rounded-xl transition-all duration-300 ${
                        item.shared 
                          ? "bg-gradient-to-br from-blue-100 to-blue-200 group-hover:from-blue-200 group-hover:to-blue-300"
                          : "bg-gradient-to-br from-primary/10 to-accent/10 group-hover:from-primary/20 group-hover:to-accent/20"
                      }`}>
                        <item.icon className={`w-8 h-8 transition-colors duration-300 ${
                          item.shared 
                            ? "text-blue-600 group-hover:text-blue-700"
                            : "text-primary group-hover:text-accent"
                        }`} />
                      </div>
                      <CardTitle className={`text-lg font-semibold transition-colors duration-300 ${
                        item.shared 
                          ? "text-blue-600 group-hover:text-blue-700"
                          : "text-primary group-hover:text-accent"
                      }`}>
                        {item.label}
                      </CardTitle>
                      {item.shared && !isAdmin && (
                        <div className="text-xs text-blue-500 font-medium px-2 py-1 bg-blue-100 rounded-full">
                          Conteúdo Compartilhado
                        </div>
                      )}
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