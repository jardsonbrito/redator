import { Link, useLocation } from "react-router-dom";
import { Home, TrendingUp, BookOpen, Grid3x3 } from "lucide-react";

const navItems = [
  { path: "/app", label: "Início", icon: Home },
  { path: "/desempenho", label: "Desempenho", icon: TrendingUp },
  { path: "/plano", label: "Plano", icon: BookOpen },
  { path: "/mais", label: "Mais", icon: Grid3x3 },
];

export const BottomNavigation = () => {
  const location = useLocation();

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
              className={`flex flex-col items-center justify-center py-3 px-4 min-w-[80px] transition-colors duration-200 ${
                isActive
                  ? "text-primary"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              <Icon className={`w-6 h-6 mb-1 ${isActive ? "stroke-[2.5]" : ""}`} />
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
