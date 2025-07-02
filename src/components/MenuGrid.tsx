
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
    <div className="space-y-8">
      <div className="text-center space-y-3">
        <h2 className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
          {showMinhasRedacoes ? "✨ Explore mais conteúdos" : "🎯 Escolha sua jornada"}
        </h2>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          {showMinhasRedacoes 
            ? "Descubra outros recursos incríveis da plataforma" 
            : "Cada seção foi pensada para turbinar seus estudos"}
        </p>
      </div>
      
      <div className={`grid grid-cols-2 md:grid-cols-3 gap-6 max-w-6xl mx-auto ${
        visibleMenuItems.length <= 4 ? 'lg:grid-cols-4' : 'lg:grid-cols-6'
      }`}>
        {visibleMenuItems.map((item, index) => (
          <Tooltip key={index}>
            <TooltipTrigger asChild>
              <Link 
                to={item.path} 
                className="group relative flex flex-col items-center p-6 bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-500 hover:scale-105 border border-white/50 hover:border-secondary/30 hover:bg-gradient-to-br hover:from-white hover:to-secondary/5"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-secondary/5 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                
                <div className="relative inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-secondary group-hover:from-secondary group-hover:to-primary transition-all duration-500 mb-4 shadow-lg group-hover:shadow-xl">
                  <item.icon className="w-8 h-8 text-white drop-shadow-sm" />
                </div>
                
                <h3 className="relative text-sm font-bold text-primary text-center leading-tight group-hover:text-secondary transition-colors duration-300">
                  {item.title}
                </h3>
              </Link>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="max-w-xs text-center p-3 bg-gradient-to-br from-primary to-secondary text-white border-0 shadow-xl">
              <p className="text-sm font-medium">{item.tooltip}</p>
            </TooltipContent>
          </Tooltip>
        ))}
      </div>
    </div>
  );
};
