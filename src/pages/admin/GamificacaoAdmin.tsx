import { useAuth } from "@/hooks/useAuth";
import { Navigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Home, LogOut } from "lucide-react";
import { AdminAvatar } from "@/components/admin/AdminAvatar";
import GamificationAdmin from "@/components/admin/GamificationAdmin";

const GamificacaoAdmin = () => {
  const { user, isAdmin, signOut } = useAuth();

  if (!user || !isAdmin) {
    return <Navigate to="/login" replace />;
  }

  const handleLogout = async () => {
    signOut();
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button asChild variant="outline" size="sm">
                <Link to="/student" className="flex items-center gap-2">
                  <Home className="h-4 w-4" />
                  Voltar ao App
                </Link>
              </Button>
              <div className="text-lg font-semibold text-primary">
                • Painel Administrativo
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <AdminAvatar />
                <div className="hidden sm:block">
                  <div className="text-sm font-medium">{user?.email}</div>
                  <div className="text-xs text-muted-foreground">Administrador</div>
                </div>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleLogout}
                className="flex items-center gap-2"
              >
                <LogOut className="h-4 w-4" />
                Sair
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Breadcrumb */}
      <div className="border-b bg-muted/30">
        <div className="container mx-auto px-4 py-2">
          <div className="flex items-center space-x-2 text-sm text-muted-foreground">
            <span>Dashboard</span>
            <span>/</span>
            <span className="text-foreground font-medium">Gamificação</span>
          </div>
        </div>
      </div>

      {/* Content */}
      <main className="container mx-auto px-4 py-6">
        <GamificationAdmin />
      </main>
    </div>
  );
};

export default GamificacaoAdmin;