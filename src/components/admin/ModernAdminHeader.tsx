import { Menu } from 'lucide-react';
import { AdminAvatar } from '@/components/admin/AdminAvatar';
import { AdminGlobalSearch } from '@/components/admin/AdminGlobalSearch';

interface ModernAdminHeaderProps {
  userEmail?: string;
  onLogout: () => void;
  onProfileClick: () => void;
  onMenuClick: () => void;
  onSearchResultClick?: (type: string, id: string) => void;
}

export const ModernAdminHeader = ({
  onProfileClick,
  onMenuClick,
  onSearchResultClick,
}: ModernAdminHeaderProps) => {
  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-10 flex-shrink-0">
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14 gap-4">
          {/* Hamburger — mobile only */}
          <button
            type="button"
            onClick={onMenuClick}
            className="lg:hidden p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors flex-shrink-0"
            aria-label="Abrir menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Busca global */}
          <div className="flex-1 flex justify-start max-w-md">
            <AdminGlobalSearch onResultClick={onSearchResultClick} />
          </div>

          {/* Avatar do admin — abre painel de perfil */}
          <button
            type="button"
            onClick={onProfileClick}
            className="flex-shrink-0 rounded-full focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-2 transition-all"
            title="Meu Perfil"
            aria-label="Abrir perfil do administrador"
          >
            <AdminAvatar size="sm" showUpload={false} />
          </button>
        </div>
      </div>
    </header>
  );
};
