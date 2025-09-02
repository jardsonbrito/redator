import { Link, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { 
  Home, 
  MessageSquare, 
  FileText, 
  PlaySquare, 
  Dumbbell, 
  Users,
  UserCheck,
  Download,
  HelpCircle,
  Trophy,
  Presentation,
  BarChart3
} from 'lucide-react';

export const AdminHeader = () => {
  const location = useLocation();

  const menuItems = [
    { path: '/admin', label: 'Dashboard', icon: Home },
    { path: '/admin/avisos', label: 'Avisos', icon: MessageSquare },
    { path: '/admin/redacoes', label: 'Redações', icon: FileText },
    { path: '/admin/simulados', label: 'Simulados', icon: PlaySquare },
    { path: '/admin/exercicios', label: 'Exercícios', icon: Dumbbell },
    { path: '/admin/corretores', label: 'Corretores', icon: UserCheck },
    { path: '/admin/visitantes', label: 'Visitantes', icon: Users },
    { path: '/admin/exportacao', label: 'Exportação', icon: Download },
    { path: '/admin/ajuda-rapida', label: 'Ajuda Rápida', icon: HelpCircle },
    { path: '/admin/gamificacao', label: 'Gamificação', icon: Trophy },
  ];

  const isActive = (path: string) => {
    if (path === '/admin') {
      return location.pathname === '/admin';
    }
    return location.pathname.startsWith(path);
  };

  return (
    <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-4">
          <div className="flex items-center gap-8">
            <Link to="/admin" className="flex items-center gap-2">
              <BarChart3 className="w-8 h-8 text-primary" />
              <span className="font-bold text-xl text-primary">Admin</span>
            </Link>
            
            <nav className="hidden lg:flex items-center space-x-1">
              {menuItems.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      isActive(item.path)
                        ? 'bg-primary text-white'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>

          <div className="flex items-center gap-4">
            <Button variant="outline" size="sm" onClick={() => {
              localStorage.clear();
              window.location.href = '/login';
            }}>
              Sair
            </Button>
          </div>
        </div>

        {/* Mobile Navigation */}
        <div className="lg:hidden pb-4">
          <div className="flex flex-wrap gap-2">
            {menuItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium transition-colors ${
                    isActive(item.path)
                      ? 'bg-primary text-white'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  }`}
                >
                  <Icon className="w-3 h-3" />
                  {item.label}
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </header>
  );
};