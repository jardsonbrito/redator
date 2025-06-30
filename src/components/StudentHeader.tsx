
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
    <header className="bg-white shadow-sm border-b border-redator-accent/20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex items-center justify-between">
          <Link to="/app" className="flex items-center gap-2 text-redator-primary hover:text-redator-accent transition-colors">
            <Home className="w-5 h-5" />
            <span className="hidden sm:inline">Início</span>
          </Link>
          
          <div className="flex items-center gap-2">
            {/* Informações do usuário */}
            {studentData.userType && (
              <span className="text-sm text-redator-accent mr-2">
                {studentData.nomeUsuario}
              </span>
            )}
            
            {/* Link para Professor se aplicável */}
            {user && isAdmin ? (
              <Link to="/admin" className="flex items-center gap-2 bg-redator-primary text-white px-3 py-1.5 rounded-md hover:bg-redator-primary/90 transition-colors text-sm">
                <Settings className="w-4 h-4" />
                <span className="hidden sm:inline">Admin</span>
              </Link>
            ) : (
              <Link to="/login" className="flex items-center gap-2 text-redator-primary hover:text-redator-accent transition-colors text-sm">
                <Settings className="w-4 h-4" />
                <span className="hidden sm:inline">Professor</span>
              </Link>
            )}
            
            {/* Botão Sair */}
            <Button 
              onClick={handleLogout}
              variant="outline" 
              size="sm"
              className="flex items-center gap-2 border-red-300 text-red-600 hover:bg-red-50 hover:border-red-400"
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
