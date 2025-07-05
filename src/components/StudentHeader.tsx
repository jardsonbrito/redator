
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { useStudentAuth } from "@/hooks/useStudentAuth";
import { Menu, LogOut } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";

interface StudentHeaderProps {
  pageTitle?: string;
}

export const StudentHeader = ({ pageTitle }: StudentHeaderProps) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const { logoutStudent } = useStudentAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logoutStudent();
    navigate("/", { replace: true });
  };

  return (
    <header className="bg-white border-b border-gray-200 shadow-sm relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-4">
          {/* Menu hambúrguer */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setMenuOpen(!menuOpen)}
            className="p-2"
          >
            <Menu className="w-5 h-5" />
          </Button>

          {/* Logo e título */}
          <div className="flex items-center gap-3 flex-1 justify-center">
            <img 
              src="/lovable-uploads/f86e5092-80dc-4e06-bb6a-f4cec6ee1b5b.png" 
              alt="Logo" 
              className="w-8 h-8" 
            />
            <h1 className="text-xl font-bold text-gray-900">
              {pageTitle || "App do Redator"}
            </h1>
          </div>

          {/* Espaço para balanceamento */}
          <div className="w-10"></div>
        </div>
      </div>

      {/* Menu dropdown */}
      {menuOpen && (
        <>
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 z-40"
            onClick={() => setMenuOpen(false)}
          />
          <div className="absolute top-full left-4 bg-white rounded-lg shadow-lg border z-50 min-w-48">
            <div className="py-2">
              <Link 
                to="/app" 
                className="block px-4 py-2 text-gray-700 hover:bg-gray-100"
                onClick={() => setMenuOpen(false)}
              >
                Início
              </Link>
              <Link 
                to="/minhas-redacoes" 
                className="block px-4 py-2 text-gray-700 hover:bg-gray-100"
                onClick={() => setMenuOpen(false)}
              >
                Minhas Redações
              </Link>
              <Link 
                to="/envie-redacao" 
                className="block px-4 py-2 text-gray-700 hover:bg-gray-100"
                onClick={() => setMenuOpen(false)}
              >
                Enviar Redação
              </Link>
              <hr className="my-2" />
              <button
                onClick={handleLogout}
                className="w-full text-left px-4 py-2 text-red-600 hover:bg-red-50 flex items-center gap-2"
              >
                <LogOut className="w-4 h-4" />
                Sair
              </button>
            </div>
          </div>
        </>
      )}
    </header>
  );
};
