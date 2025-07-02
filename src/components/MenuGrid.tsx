
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
      <div className="text-center space-y-4 mb-8">
        <div className="relative">
          <h2 className="text-3xl md:text-4xl font-black bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
            {showMinhasRedacoes ? "🌟 Explore mais recursos" : "🎨 Escolha sua aventura"}
          </h2>
          <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-16 h-0.5 bg-gradient-to-r from-primary to-secondary rounded-full opacity-60"></div>
        </div>
        <p className="text-base md:text-lg text-primary/70 max-w-2xl mx-auto font-medium">
          {showMinhasRedacoes 
            ? "Cada ferramenta foi criada especialmente para o seu sucesso! 💪" 
            : "Transforme seus estudos numa jornada épica de aprendizado 📚✨"}
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
                className="group relative flex flex-col items-center p-6 bg-white/90 backdrop-blur-sm rounded-3xl shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105 hover:-translate-y-2 border border-white/60 hover:border-primary/20 overflow-hidden"
              >
                {/* Efeito de brilho no hover */}
                <div className="absolute inset-0 bg-gradient-to-br from-primary/0 via-secondary/0 to-accent/0 group-hover:from-primary/5 group-hover:via-secondary/10 group-hover:to-accent/5 transition-all duration-500 rounded-3xl"></div>
                
                {/* Ícone com design flat moderno */}
                <div className="relative mb-4 group-hover:scale-110 transition-transform duration-300">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/10 to-secondary/10 flex items-center justify-center border border-primary/20 group-hover:border-primary/40 transition-colors duration-300">
                    <item.icon className="w-7 h-7 text-primary group-hover:text-secondary transition-colors duration-300" />
                  </div>
                  {/* Efeito de onda no hover */}
                  <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-primary to-secondary opacity-0 group-hover:opacity-20 transition-opacity duration-500"></div>
                </div>
                
                {/* Título com tipografia moderna */}
                <h3 className="relative text-sm font-bold text-primary/90 text-center leading-snug group-hover:text-primary transition-colors duration-300 tracking-wide">
                  {item.title}
                </h3>
                
                {/* Indicador visual de interação */}
                <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 w-0 h-0.5 bg-gradient-to-r from-primary to-secondary group-hover:w-8 transition-all duration-500 rounded-full"></div>
              </Link>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="max-w-xs text-center p-4 bg-white/95 backdrop-blur-sm border border-primary/20 shadow-2xl rounded-2xl">
              <p className="text-sm font-semibold text-primary/90">{item.tooltip}</p>
            </TooltipContent>
          </Tooltip>
        ))}
      </div>
    </div>
  );
};
