
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
    <header className="bg-white/95 backdrop-blur-lg shadow-xl border-b border-primary/10 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
        <div className="flex items-center justify-between">
          <Link 
            to="/app" 
            className="group flex items-center gap-3 hover:scale-105 transition-all duration-300"
          >
            <div className="relative">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary/10 to-secondary/10 flex items-center justify-center border border-primary/20 group-hover:border-primary/40 transition-all duration-300 shadow-lg group-hover:shadow-xl">
                <Home className="w-6 h-6 text-primary group-hover:text-secondary transition-colors duration-300" />
              </div>
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-primary to-secondary opacity-0 group-hover:opacity-10 transition-opacity duration-300"></div>
            </div>
            <span className="hidden sm:inline font-bold text-lg text-primary/90 group-hover:text-primary transition-colors duration-300">Início</span>
          </Link>
          
          <div className="flex items-center gap-3">
            {/* Badge da turma com design moderno */}
            {studentData.userType && (
              <div className="flex items-center gap-2 bg-white/80 backdrop-blur-sm px-4 py-2 rounded-full border border-primary/20 shadow-lg">
                <div className="w-2 h-2 bg-gradient-to-r from-primary to-secondary rounded-full animate-pulse"></div>
                <span className="text-sm font-bold text-primary/90">
                  {studentData.userType === "aluno" && studentData.turma ? 
                    `${studentData.turma}` : 
                    "Visitante"
                  }
                </span>
              </div>
            )}
            
            {/* Link para Professor apenas se for admin autenticado */}
            {user && isAdmin && (
              <Link 
                to="/admin" 
                className="flex items-center gap-2 bg-gradient-to-br from-primary to-secondary text-white px-4 py-2 rounded-2xl hover:scale-105 hover:shadow-xl transition-all duration-300 text-sm font-bold shadow-lg border border-white/20"
              >
                <Settings className="w-4 h-4" />
                <span className="hidden sm:inline">Admin</span>
              </Link>
            )}
            
            {/* Botão Sair com design flat moderno */}
            <Button 
              onClick={handleLogout}
              variant="outline" 
              size="sm"
              className="flex items-center gap-2 border-red-200/60 text-red-500 hover:bg-red-50 hover:border-red-300 hover:text-red-600 rounded-2xl px-4 py-2 font-bold transition-all duration-300 hover:shadow-lg hover:scale-105 bg-white/80 backdrop-blur-sm"
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
