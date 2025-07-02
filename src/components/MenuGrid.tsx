
import { Link } from "react-router-dom";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { LucideIcon } from "lucide-react";

interface MenuItem {
  title: string;
  path: string;
  icon: LucideIcon;
  tooltip: string;
  showAlways: boolean;
  showCondition?: boolean;
}

interface MenuGridProps {
  menuItems: MenuItem[];
  showMinhasRedacoes: boolean;
}

export const MenuGrid = ({ menuItems, showMinhasRedacoes }: MenuGridProps) => {
  // Filtra os itens do menu baseado na disponibilidade de conteúdo
  const visibleMenuItems = menuItems.filter(item => {
    if (item.showAlways) return true;
    return item.showCondition === true;
  });

  // Cores específicas para cada card baseadas na referência visual
  const getCardColor = (index: number, title: string) => {
    const colors = [
      { bg: "bg-red-300", icon: "text-red-700", hover: "hover:bg-red-200" }, // Mural
      { bg: "bg-teal-300", icon: "text-teal-700", hover: "hover:bg-teal-200" }, // Aulas
      { bg: "bg-yellow-300", icon: "text-yellow-700", hover: "hover:bg-yellow-200" }, // Temas
      { bg: "bg-purple-400", icon: "text-purple-800", hover: "hover:bg-purple-300" }, // Biblioteca
      { bg: "bg-pink-300", icon: "text-pink-700", hover: "hover:bg-pink-200" }, // Redações
      { bg: "bg-orange-300", icon: "text-orange-700", hover: "hover:bg-orange-200" }, // Videoteca
      { bg: "bg-blue-300", icon: "text-blue-700", hover: "hover:bg-blue-200" }, // Simulados
      { bg: "bg-green-300", icon: "text-green-700", hover: "hover:bg-green-200" }, // Exercícios
      { bg: "bg-indigo-300", icon: "text-indigo-700", hover: "hover:bg-indigo-200" }, // Enviar Redação
    ];
    return colors[index % colors.length];
  };

  return (
    <div className="space-y-8">
      {/* Grid de cards coloridos inspirado na referência */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 max-w-5xl mx-auto">
        {visibleMenuItems.map((item, index) => {
          const cardColor = getCardColor(index, item.title);
          return (
            <Tooltip key={index}>
              <TooltipTrigger asChild>
                <Link 
                  to={item.path} 
                  className={`group relative flex flex-col items-center justify-center p-6 ${cardColor.bg} rounded-2xl shadow-lg ${cardColor.hover} transition-all duration-300 hover:scale-105 hover:shadow-xl min-h-[120px]`}
                >
                  {/* Ícone com estilo flat */}
                  <div className="mb-3">
                    <item.icon className={`w-8 h-8 ${cardColor.icon}`} />
                  </div>
                  
                  {/* Título do card */}
                  <h3 className={`text-sm font-bold ${cardColor.icon} text-center leading-tight`}>
                    {item.title}
                  </h3>
                </Link>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-xs text-center p-3 bg-white border border-gray-200 shadow-lg rounded-xl">
                <p className="text-xs font-medium text-gray-700">{item.tooltip}</p>
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>
    </div>
  );
};
