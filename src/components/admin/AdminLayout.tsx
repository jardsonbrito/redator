
import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { LogOut, User, Users, FileText, BookOpen, Calendar, MessageSquare, Video, Library, Target, Radar, UserCheck, Menu, X } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useIsMobile } from "@/hooks/use-mobile";

interface AdminLayoutProps {
  children: React.ReactNode;
}

export const AdminLayout = ({ children }: AdminLayoutProps) => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const isMobile = useIsMobile();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const menuItems = [
    { icon: Users, label: "Alunos", path: "/admin/alunos" },
    { icon: Target, label: "Créditos", path: "/admin/creditos" },
    { icon: FileText, label: "Redações", path: "/admin/redacoes" },
    { icon: BookOpen, label: "Temas", path: "/admin/temas" },
    { icon: Calendar, label: "Aulas", path: "/admin/aulas" },
    { icon: MessageSquare, label: "Avisos", path: "/admin/avisos" },
    { icon: Video, label: "Vídeos", path: "/admin/videos" },
    { icon: Library, label: "Biblioteca", path: "/admin/biblioteca" },
    { icon: Target, label: "Exercícios", path: "/admin/exercicios" },
    { icon: Radar, label: "Radar", path: "/admin/radar" },
    { icon: UserCheck, label: "Corretores", path: "/admin/corretores" },
  ];

  const handleLogout = () => {
    logout();
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header - Responsivo */}
      <header className="border-b bg-white shadow-sm">
        <div className="flex items-center justify-between px-3 sm:px-6 py-3 sm:py-4">
          <div className="flex items-center gap-2 sm:gap-4 flex-1 min-w-0">
            {isMobile && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="p-1 sm:p-2"
              >
                {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </Button>
            )}
            
            <img 
              src="/lovable-uploads/f86e5092-80dc-4e06-bb6a-f4cec6ee1b5b.png" 
              alt="Logo" 
              className="w-8 h-8 sm:w-10 sm:h-10 object-contain shrink-0" 
            />
            
            <div className="min-w-0 flex-1">
              <h1 className="text-base sm:text-xl font-bold text-redator-primary truncate">
                {isMobile ? "Admin" : "Painel do Administrador"}
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground truncate">
                Seja bem-vindo, {user?.email || 'Administrador'}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2 sm:gap-4 shrink-0">
            {!isMobile && (
              <div className="flex items-center gap-2 text-xs sm:text-sm">
                <User className="w-3 h-3 sm:w-4 sm:h-4" />
                <span className="max-w-32 sm:max-w-none truncate">{user?.email}</span>
              </div>
            )}
            <Button variant="outline" onClick={handleLogout} size="sm" className="px-2 sm:px-4">
              <LogOut className="w-4 h-4 sm:mr-2" />
              {!isMobile && <span>Sair</span>}
            </Button>
          </div>
        </div>
      </header>

      <div className="flex relative">
        {/* Sidebar - Responsiva */}
        <aside className={`
          ${isMobile 
            ? `fixed inset-y-0 left-0 z-50 w-64 bg-white border-r shadow-lg transform transition-transform duration-300 ease-in-out ${
                sidebarOpen ? 'translate-x-0' : '-translate-x-full'
              } top-[73px]`
            : 'w-52 lg:w-64 bg-white border-r shadow-sm'
          } min-h-[calc(100vh-73px)]
        `}>
          {isMobile && sidebarOpen && (
            <div 
              className="fixed inset-0 bg-black/20 z-40 top-[73px]"
              onClick={() => setSidebarOpen(false)}
            />
          )}
          
          <nav className="p-3 sm:p-4 relative z-50 bg-white">
            <ul className="space-y-1 sm:space-y-2">
              {menuItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                
                return (
                  <li key={item.path}>
                    <Link
                      to={item.path}
                      onClick={() => isMobile && setSidebarOpen(false)}
                      className={`flex items-center gap-2 sm:gap-3 px-2 sm:px-3 py-2 rounded-lg transition-colors text-sm ${
                        isActive 
                          ? 'bg-redator-primary text-white' 
                          : 'hover:bg-muted text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      <Icon className="w-4 h-4 shrink-0" />
                      <span className="truncate">{item.label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
        </aside>

        {/* Main Content - Responsivo */}
        <main className="flex-1 p-3 sm:p-6 min-w-0">
          {children}
        </main>
      </div>
    </div>
  );
};
