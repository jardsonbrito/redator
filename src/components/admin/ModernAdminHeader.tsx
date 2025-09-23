import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import { AdminAvatar } from "@/components/admin/AdminAvatar";

interface ModernAdminHeaderProps {
  userEmail?: string;
  onLogout: () => void;
}

export const ModernAdminHeader = ({ userEmail, onLogout }: ModernAdminHeaderProps) => {
  return (
    <header className="bg-white/95 backdrop-blur-sm shadow-sm border-b border-gray-200/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo e título */}
          <div className="flex items-center gap-3">
            <img
              src="/lovable-uploads/f86e5092-80dc-4e06-bb6a-f4cec6ee1b5b.png"
              alt="Logo"
              className="w-8 h-8 object-contain"
            />
            <div className="hidden sm:block">
              <h1 className="text-lg font-semibold text-gray-900">
                Painel Administrativo
              </h1>
              <p className="text-xs text-gray-500">
                Sistema de Gestão
              </p>
            </div>
            <div className="sm:hidden">
              <h1 className="text-base font-semibold text-gray-900">
                Admin
              </h1>
            </div>
          </div>

          {/* Usuário e ações */}
          <div className="flex items-center gap-4">
            {/* Informações do usuário */}
            <div className="hidden md:flex items-center gap-3">
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">
                  {userEmail?.split('@')[0] || 'Administrador'}
                </p>
                <p className="text-xs text-gray-500">
                  Administrador
                </p>
              </div>
              <AdminAvatar size="sm" showUpload={false} />
            </div>

            {/* Avatar mobile */}
            <div className="md:hidden">
              <AdminAvatar size="sm" showUpload={false} />
            </div>

            {/* Botão de logout */}
            <Button
              variant="ghost"
              size="sm"
              onClick={onLogout}
              className="text-gray-500 hover:text-red-500 hover:bg-red-50 transition-colors duration-200 p-2"
            >
              <LogOut className="w-4 h-4" />
              <span className="sr-only">Sair</span>
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
};