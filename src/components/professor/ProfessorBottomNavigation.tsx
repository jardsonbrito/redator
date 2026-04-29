import { useLocation } from "react-router-dom";
import { Link } from "react-router-dom";
import { Home, Bot, BookOpen, GraduationCap, Grid3x3 } from "lucide-react";

const navItems = [
  { path: "/professor",               label: "Início",  icon: Home },
  { path: "/professor/jarvis-correcao", label: "Jarvis",  icon: Bot },
  { path: "/professor/temas",         label: "Temas",   icon: BookOpen },
  { path: "/professor/aulas",         label: "Aulas",   icon: GraduationCap },
  { path: "/professor/turmas",        label: "Turmas",  icon: Grid3x3 },
];

export const ProfessorBottomNavigation = () => {
  const location = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-40">
      <div className="flex items-center justify-around max-w-md mx-auto">
        {navItems.map((item) => {
          const isActive =
            item.path === "/professor"
              ? location.pathname === "/professor" || location.pathname === "/professor/dashboard"
              : location.pathname.startsWith(item.path);
          const Icon = item.icon;

          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex flex-col items-center justify-center py-3 px-3 min-w-[64px] transition-colors duration-200 ${
                isActive ? "text-primary" : "text-gray-500 hover:text-gray-700"
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
