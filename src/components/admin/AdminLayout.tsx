
import { Sidebar } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { 
  Users, 
  FileText, 
  BookOpen, 
  Video, 
  Settings, 
  LogOut, 
  Home,
  UserCheck,
  GraduationCap,
  Calendar,
  Menu
} from "lucide-react";
import { Link, useLocation } from "react-router-dom";

interface AdminLayoutProps {
  children: React.ReactNode;
}

export const AdminLayout = ({ children }: AdminLayoutProps) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { signOut } = useAuth(); // Changed from logout to signOut
  const location = useLocation();

  const menuItems = [
    { name: "Dashboard", href: "/admin", icon: Home },
    { name: "Redações", href: "/admin/redacoes", icon: FileText },
    { name: "Alunos", href: "/admin/alunos", icon: Users },
    { name: "Corretores", href: "/admin/corretores", icon: UserCheck },
    { name: "Gerenciar Aulas", href: "/admin/aulas", icon: GraduationCap },
    { name: "Aulas Virtuais", href: "/admin/aulas-virtuais", icon: Calendar },
    { name: "Biblioteca", href: "/admin/biblioteca", icon: BookOpen },
    { name: "Vídeos", href: "/admin/videos", icon: Video },
    { name: "Configurações", href: "/admin/configuracoes", icon: Settings },
  ];

  const isActivePath = (path: string) => {
    if (path === "/admin") {
      return location.pathname === "/admin";
    }
    return location.pathname.startsWith(path);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile menu button */}
      <div className="lg:hidden bg-white border-b px-4 py-3 flex items-center justify-between">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="p-2"
        >
          <Menu className="w-5 h-5" />
        </Button>
        <h1 className="font-semibold text-gray-900">Painel Administrativo</h1>
        <div className="w-9"></div> {/* Spacer for center alignment */}
      </div>

      <div className="flex">
        {/* Sidebar */}
        <div className={`fixed inset-y-0 left-0 z-50 w-64 bg-white border-r transform transition-transform duration-200 ease-in-out lg:translate-x-0 lg:static lg:inset-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}>
          <div className="flex flex-col h-full">
            {/* Logo */}
            <div className="flex items-center gap-3 px-6 py-4 border-b">
              <img 
                src="/lovable-uploads/f86e5092-80dc-4e06-bb6a-f4cec6ee1b5b.png" 
                alt="Logo" 
                className="w-8 h-8" 
              />
              <span className="font-bold text-lg text-gray-900">Admin</span>
            </div>

            {/* Navigation */}
            <nav className="flex-1 px-4 py-4 space-y-1">
              {menuItems.map((item) => {
                const Icon = item.icon;
                const isActive = isActivePath(item.href);
                
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    onClick={() => setSidebarOpen(false)}
                    className={`flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                      isActive
                        ? 'bg-primary text-primary-foreground'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {item.name}
                  </Link>
                );
              })}
            </nav>

            {/* Logout button */}
            <div className="p-4 border-t">
              <Button
                variant="outline"
                onClick={signOut} // Changed from logout to signOut
                className="w-full justify-start gap-2"
              >
                <LogOut className="w-4 h-4" />
                Sair
              </Button>
            </div>
          </div>
        </div>

        {/* Overlay for mobile */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Main content */}
        <div className="flex-1 flex flex-col min-h-screen lg:ml-0">
          <main className="flex-1 p-6">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
};
