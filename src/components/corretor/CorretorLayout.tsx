
import { useState } from "react";
import { useCorretorAuth } from "@/hooks/useCorretorAuth";
import { Button } from "@/components/ui/button";
import { LogOut, User, Home, BookOpen, Video, Library, FileText, Trophy } from "lucide-react";
import { Link, useLocation } from "react-router-dom";

interface CorretorLayoutProps {
  children: React.ReactNode;
}

export const CorretorLayout = ({ children }: CorretorLayoutProps) => {
  const { corretor, logout } = useCorretorAuth();
  const location = useLocation();

  const menuItems = [
    { icon: Home, label: "Home", path: "/corretor" },
    { icon: BookOpen, label: "Temas", path: "/corretor/temas" },
    { icon: FileText, label: "Simulados", path: "/corretor/simulados" },
    { icon: Video, label: "Aulas", path: "/corretor/aulas" },
    { icon: Video, label: "Videoteca", path: "/corretor/videoteca" },
    { icon: Library, label: "Biblioteca", path: "/corretor/biblioteca" },
    { icon: FileText, label: "Redações Exemplar", path: "/corretor/redacoes" },
    { icon: Trophy, label: "Top 5", path: "/corretor/top5" },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-white shadow-sm">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-4">
            <img 
              src="/lovable-uploads/f86e5092-80dc-4e06-bb6a-f4cec6ee1b5b.png" 
              alt="Logo" 
              className="w-10 h-10 object-contain" 
            />
            <div>
              <h1 className="text-xl font-bold text-redator-primary">Painel do Corretor</h1>
              <p className="text-sm text-muted-foreground">Bem-vindo(a), {corretor?.nome_completo}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-sm">
              <User className="w-4 h-4" />
              <span>{corretor?.email}</span>
            </div>
            <Button variant="outline" onClick={logout} size="sm">
              <LogOut className="w-4 h-4 mr-2" />
              Sair
            </Button>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <aside className="w-64 bg-white border-r shadow-sm min-h-[calc(100vh-80px)]">
          <nav className="p-4">
            <ul className="space-y-2">
              {menuItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                
                return (
                  <li key={item.path}>
                    <Link
                      to={item.path}
                      className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                        isActive 
                          ? 'bg-redator-primary text-white' 
                          : 'hover:bg-muted text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-6">
          {children}
        </main>
      </div>
    </div>
  );
};
