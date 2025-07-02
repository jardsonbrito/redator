
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Home, LogOut, Settings } from "lucide-react";
import { useStudentAuth } from "@/hooks/useStudentAuth";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

export const StudentHeader = () => {
  const { studentData, logoutStudent } = useStudentAuth();
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleLogout = () => {
    logoutStudent();
    toast({
      title: "Sessão encerrada",
      description: "Você foi desconectado com sucesso.",
    });
    navigate('/', { replace: true });
  };

  return (
    <header className="bg-white/90 backdrop-blur-md shadow-lg border-b border-white/20 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex items-center justify-between">
          <Link 
            to="/app" 
            className="group flex items-center gap-3 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent hover:from-secondary hover:to-primary transition-all duration-300"
          >
            <div className="p-2 bg-gradient-to-r from-primary to-secondary rounded-lg group-hover:from-secondary group-hover:to-primary transition-all duration-300 shadow-md">
              <Home className="w-5 h-5 text-white" />
            </div>
            <span className="hidden sm:inline font-bold text-lg">Início</span>
          </Link>
          
          <div className="flex items-center gap-3">
            {/* Informações do usuário */}
            {studentData.userType && (
              <div className="bg-gradient-to-r from-primary/10 to-secondary/10 px-4 py-2 rounded-full border border-primary/20">
                <span className="text-sm font-medium text-primary">
                  {studentData.nomeUsuario}
                </span>
              </div>
            )}
            
            {/* Link para Professor apenas se for admin autenticado */}
            {user && isAdmin && (
              <Link 
                to="/admin" 
                className="flex items-center gap-2 bg-gradient-to-r from-primary to-secondary text-white px-4 py-2 rounded-full hover:from-secondary hover:to-primary transition-all duration-300 text-sm font-medium shadow-lg hover:shadow-xl"
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
              className="flex items-center gap-2 border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 rounded-full px-4 py-2 font-medium transition-all duration-300 hover:shadow-lg"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Sair</span>
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
};
