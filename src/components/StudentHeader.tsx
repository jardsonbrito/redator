
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { LogOut, Settings } from "lucide-react";
import { useStudentAuth } from "@/hooks/useStudentAuth";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { StudentAvatar } from "@/components/StudentAvatar";
import { useIsMobile } from "@/hooks/use-mobile";
import { BreadcrumbNavigation } from "@/components/BreadcrumbNavigation";

interface StudentHeaderProps {
  pageTitle?: string;
}

export const StudentHeader = ({ pageTitle }: StudentHeaderProps) => {
  const { studentData, logoutStudent } = useStudentAuth();
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const isMobile = useIsMobile();

  const handleLogout = () => {
    logoutStudent();
    toast({
      title: "Sessão encerrada",
      description: "Você foi desconectado com sucesso.",
    });
    navigate('/', { replace: true });
  };

  return (
    <>
      <header className="bg-primary shadow-lg sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
          <div className="flex items-center justify-between">
            {/* Título à esquerda */}
            <Link
              to="/app"
              className="flex items-center text-primary-foreground hover:text-secondary transition-colors duration-200"
            >
              <span className="font-bold text-xl">App do Redator</span>
            </Link>

            {/* Controles do usuário à direita */}
            <div className="flex items-center gap-4">
              {/* Perfil do usuário com avatar clicável, nome e turma */}
              <div className="flex items-center gap-3">
                <StudentAvatar size="sm" showUpload={true} />
                <div className="hidden sm:flex flex-col">
                  <span className="text-primary-foreground font-medium text-sm">
                    {studentData.nomeUsuario || 'Usuário'}
                  </span>
                  {studentData.userType === "aluno" && studentData.turma && (
                    <span className="text-primary-foreground/70 text-xs">
                      {studentData.turma}
                    </span>
                  )}
                </div>
              </div>

              {/* Link para Professor apenas se for admin autenticado */}
              {user && isAdmin && (
                <Link
                  to="/admin"
                  className="flex items-center gap-2 bg-secondary/20 text-primary-foreground px-3 py-2 rounded-xl hover:bg-secondary/30 transition-colors duration-200 text-sm font-medium"
                >
                  <Settings className="w-4 h-4" />
                  <span className="hidden sm:inline">Admin</span>
                </Link>
              )}

              {/* Botão Sair */}
              <Button
                onClick={handleLogout}
                variant="outline"
                size="sm"
                className="flex items-center gap-2 border-secondary/30 text-primary-foreground hover:bg-secondary/20 hover:border-secondary/50 rounded-xl px-3 py-2 font-medium transition-colors duration-200 bg-transparent"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Sair</span>
              </Button>
            </div>
          </div>
        </div>
      </header>
      <BreadcrumbNavigation />
    </>
  );
};
