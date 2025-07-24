
import { Link } from "react-router-dom";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { LucideIcon, Lock } from "lucide-react";
import { useState } from "react";
import { UnlockModal } from "./UnlockModal";
import { useTurmaERestrictions } from "@/hooks/useTurmaERestrictions";

interface MenuItem {
  title: string;
  path: string;
  icon: LucideIcon;
  tooltip: string;
  showAlways: boolean;
  showCondition?: boolean;
  resourceType?: string;
}

interface MenuGridProps {
  menuItems: MenuItem[];
  showMinhasRedacoes: boolean;
}

export const MenuGrid = ({ menuItems, showMinhasRedacoes }: MenuGridProps) => {
  const [showUnlockModal, setShowUnlockModal] = useState(false);
  const [selectedResource, setSelectedResource] = useState('');
  const { isBlockedResource } = useTurmaERestrictions();

  // Filtra os itens do menu baseado na disponibilidade de conteúdo
  const visibleMenuItems = menuItems.filter(item => {
    if (item.showAlways) return true;
    return item.showCondition === true;
  });

  const handleBlockedClick = (resourceName: string) => {
    setSelectedResource(resourceName);
    setShowUnlockModal(true);
  };

  // Paleta harmonizada baseada em tons roxos/lilás
  const getCardColor = (index: number, title: string) => {
    const colors = [
      { bg: "bg-secondary/60", icon: "text-primary", hover: "hover:bg-secondary/70" }, // Temas
      { bg: "bg-primary/20", icon: "text-primary", hover: "hover:bg-primary/30" }, // Redações
      { bg: "bg-accent/40", icon: "text-primary", hover: "hover:bg-accent/50" }, // Videoteca
      { bg: "bg-secondary/80", icon: "text-primary", hover: "hover:bg-secondary/90" }, // Biblioteca
      { bg: "bg-primary/30", icon: "text-white", hover: "hover:bg-primary/40" }, // Simulados
      { bg: "bg-accent/60", icon: "text-white", hover: "hover:bg-accent/70" }, // Aulas
      { bg: "bg-secondary/40", icon: "text-primary", hover: "hover:bg-secondary/50" }, // Exercícios
      { bg: "bg-primary/40", icon: "text-white", hover: "hover:bg-primary/50" }, // Enviar Redação
    ];
    return colors[index % colors.length];
  };

  return (
    <div className="space-y-8">
      {/* Grid de cards coloridos inspirado na referência */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 max-w-5xl mx-auto">
        {visibleMenuItems.map((item, index) => {
          const cardColor = getCardColor(index, item.title);
          const isBlocked = item.resourceType && isBlockedResource(item.resourceType);
          
          return (
            <Tooltip key={index}>
              <TooltipTrigger asChild>
                {isBlocked ? (
                  <div 
                    onClick={() => handleBlockedClick(item.title)}
                    className={`group relative flex flex-col items-center justify-center p-6 ${cardColor.bg} rounded-2xl shadow-lg hover:bg-muted/70 transition-all duration-300 hover:scale-105 hover:shadow-xl min-h-[120px] cursor-pointer opacity-75`}
                  >
                    {/* Ícone de cadeado para recursos bloqueados */}
                    <div className="mb-3">
                      <Lock className={`w-8 h-8 ${cardColor.icon}`} />
                    </div>
                    
                    {/* Título do card */}
                    <h3 className={`text-sm font-bold ${cardColor.icon} text-center leading-tight`}>
                      {item.title}
                    </h3>
                    
                    {/* Badge de bloqueado */}
                    <div className="absolute top-2 right-2">
                      <div className="bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                        Bloqueado
                      </div>
                    </div>
                  </div>
                ) : (
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
                )}
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-xs text-center p-3 bg-white border border-gray-200 shadow-lg rounded-xl">
                <p className="text-xs font-medium text-gray-700">
                  {isBlocked ? "Recurso bloqueado para Turma E" : item.tooltip}
                </p>
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>
      
      <UnlockModal 
        open={showUnlockModal}
        onOpenChange={setShowUnlockModal}
        resourceName={selectedResource}
      />
    </div>
  );
};
