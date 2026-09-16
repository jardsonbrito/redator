import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { Home, TrendingUp, BookOpen, Grid3x3, MessageCircle, ClipboardList } from "lucide-react";
import { useStudentAuth } from "@/hooks/useStudentAuth";
import { useAjudaRapida } from "@/hooks/useAjudaRapida";

export const BottomNavigation = () => {
  const location = useLocation();
  const { studentData } = useStudentAuth();
  const { buscarMensagensNaoLidasAluno } = useAjudaRapida();
  const [mensagensNaoLidas, setMensagensNaoLidas] = useState(0);

  useEffect(() => {
    if (!studentData.email) return;

    const fetchCount = async () => {
      const count = await buscarMensagensNaoLidasAluno(studentData.email);
      setMensagensNaoLidas(count);
    };

    fetchCount();
    const interval = setInterval(fetchCount, 30000);

    const handleLidas = () => fetchCount();
    window.addEventListener('mensagensLidas', handleLidas);

    return () => {
      clearInterval(interval);
      window.removeEventListener('mensagensLidas', handleLidas);
    };
  }, [studentData.email]);

  const navItems = [
    { path: "/app",             label: "Início",        icon: Home },
    { path: "/ajuda-rapida",    label: "Ajuda Rápida",  icon: MessageCircle, badge: mensagensNaoLidas },
    { path: "/interatividade",  label: "Interatividade", icon: ClipboardList },
    { path: "/desempenho",      label: "Desempenho",    icon: TrendingUp },
    { path: "/mais",            label: "Mais",          icon: Grid3x3 },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-40">
      <div className="flex items-center justify-around max-w-md mx-auto">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          const Icon = item.icon;

          return (
            <Link
              key={item.path}
              to={item.path}
              className={`relative flex flex-col items-center justify-center py-3 px-3 min-w-[64px] transition-colors duration-200 ${
                isActive ? "text-primary" : "text-gray-500 hover:text-gray-700"
              }`}
            >
              <div className="relative">
                <Icon className={`w-6 h-6 mb-1 ${isActive ? "stroke-[2.5]" : ""}`} />
                {item.badge != null && item.badge > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[16px] h-4 flex items-center justify-center px-1 leading-none">
                    {item.badge > 99 ? '99+' : item.badge}
                  </span>
                )}
              </div>
              <span className={`text-xs ${isActive ? "font-semibold" : "font-medium"}`}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};
