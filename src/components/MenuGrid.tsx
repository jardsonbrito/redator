
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

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold text-redator-primary text-center">
        {showMinhasRedacoes ? "Explorar outras seções:" : "Escolha por onde começar:"}
      </h2>
      
      <div className={`grid grid-cols-2 md:grid-cols-3 gap-4 max-w-5xl mx-auto ${
        visibleMenuItems.length <= 4 ? 'lg:grid-cols-4' : 'lg:grid-cols-6'
      }`}>
        {visibleMenuItems.map((item, index) => (
          <Tooltip key={index}>
            <TooltipTrigger asChild>
              <Link to={item.path} className="group flex flex-col items-center p-4 bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-300 hover:scale-105 border border-redator-accent/10 hover:border-redator-secondary/30">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-redator-primary group-hover:bg-redator-secondary transition-colors duration-300 mb-3">
                  <item.icon className="w-6 h-6 text-white" />
                </div>
                
                <h3 className="text-xs font-semibold text-redator-primary text-center leading-tight group-hover:text-redator-secondary transition-colors">
                  {item.title}
                </h3>
              </Link>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="max-w-xs text-center p-2 bg-redator-primary text-white border-redator-primary">
              <p className="text-xs">{item.tooltip}</p>
            </TooltipContent>
          </Tooltip>
        ))}
      </div>
    </div>
  );
};
