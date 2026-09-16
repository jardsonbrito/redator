import { Link } from "react-router-dom";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { LucideIcon } from "lucide-react";

interface ProfessorMenuItem {
  title: string;
  path: string;
  icon: LucideIcon | React.ComponentType<{ className?: string }>;
  tooltip: string;
}

interface ProfessorMenuGridProps {
  menuItems: ProfessorMenuItem[];
}

const CARD_COLORS = [
  { bg: "bg-secondary/60", icon: "text-primary", hover: "hover:bg-secondary/70" },
  { bg: "bg-primary/20", icon: "text-primary", hover: "hover:bg-primary/30" },
  { bg: "bg-accent/40", icon: "text-primary", hover: "hover:bg-accent/50" },
  { bg: "bg-secondary/80", icon: "text-primary", hover: "hover:bg-secondary/90" },
  { bg: "bg-primary/30", icon: "text-white", hover: "hover:bg-primary/40" },
  { bg: "bg-accent/60", icon: "text-white", hover: "hover:bg-accent/70" },
  { bg: "bg-secondary/40", icon: "text-primary", hover: "hover:bg-secondary/50" },
  { bg: "bg-primary/40", icon: "text-white", hover: "hover:bg-primary/50" },
];

export const ProfessorMenuGrid = ({ menuItems }: ProfessorMenuGridProps) => {
  return (
    <div className="grid grid-cols-2 gap-4 max-w-5xl mx-auto">
      {menuItems.map((item, index) => {
        const color = CARD_COLORS[index % CARD_COLORS.length];
        const Icon = item.icon;

        return (
          <Tooltip key={item.path}>
            <TooltipTrigger asChild>
              <Link
                to={item.path}
                className={`group flex flex-col items-center justify-center p-6 rounded-2xl shadow-lg transition-all duration-300 hover:scale-105 hover:shadow-xl min-h-[120px] ${color.bg} ${color.hover}`}
              >
                <div className="mb-3">
                  <Icon className={`w-8 h-8 ${color.icon}`} />
                </div>
                <h3 className={`text-sm font-bold text-center leading-tight ${color.icon}`}>
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
  );
};
