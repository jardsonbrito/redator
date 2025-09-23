import { LucideIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface ModernAdminCardProps {
  id: string;
  title: string;
  info: string;
  badge?: string;
  badgeVariant?: "default" | "secondary" | "destructive" | "outline";
  icon: LucideIcon;
  onClick: (id: string) => void;
  colorIndex: number;
}

export const ModernAdminCard = ({
  id,
  title,
  info,
  badge,
  badgeVariant = "default",
  icon: Icon,
  onClick,
  colorIndex
}: ModernAdminCardProps) => {
  // Paleta baseada nas cores do projeto (primary, secondary, accent) seguindo o padrão dos cards do aluno
  const getCardStyle = (index: number) => {
    const styles = [
      // Baseado em bg-secondary/60, bg-primary/20, bg-accent/40, etc. com gradientes
      { bg: "bg-gradient-to-br from-secondary/70 to-secondary/50", text: "text-primary", hover: "hover:from-secondary/80 hover:to-secondary/60" },
      { bg: "bg-gradient-to-br from-primary/30 to-primary/20", text: "text-primary", hover: "hover:from-primary/40 hover:to-primary/30" },
      { bg: "bg-gradient-to-br from-accent/50 to-accent/30", text: "text-white", hover: "hover:from-accent/60 hover:to-accent/40" },
      { bg: "bg-gradient-to-br from-secondary/80 to-secondary/60", text: "text-primary", hover: "hover:from-secondary/90 hover:to-secondary/70" },
      { bg: "bg-gradient-to-br from-primary/40 to-primary/30", text: "text-white", hover: "hover:from-primary/50 hover:to-primary/40" },
      { bg: "bg-gradient-to-br from-accent/60 to-accent/40", text: "text-white", hover: "hover:from-accent/70 hover:to-accent/50" },
      { bg: "bg-gradient-to-br from-secondary/50 to-secondary/30", text: "text-primary", hover: "hover:from-secondary/60 hover:to-secondary/40" },
      { bg: "bg-gradient-to-br from-primary/50 to-primary/40", text: "text-white", hover: "hover:from-primary/60 hover:to-primary/50" },
    ];
    return styles[index % styles.length];
  };

  const cardStyle = getCardStyle(colorIndex);

  return (
    <div
      onClick={() => onClick(id)}
      className={`
        group relative cursor-pointer rounded-2xl p-6 shadow-lg transition-all duration-300
        hover:shadow-xl hover:scale-105 min-h-[140px] flex flex-col justify-between
        ${cardStyle.bg} ${cardStyle.hover} ${cardStyle.text}
      `}
    >
      {/* Header com título e badge */}
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center gap-3">
          <Icon className="w-6 h-6" />
          <h3 className="text-sm font-semibold leading-tight">{title}</h3>
        </div>
        {badge && (
          <Badge
            variant={badgeVariant}
            className="text-xs bg-white/20 text-white border-white/30 hover:bg-white/30"
          >
            {badge}
          </Badge>
        )}
      </div>

      {/* Informação principal */}
      <div className="mt-auto">
        <p className="text-lg font-bold leading-tight">{info}</p>
      </div>

      {/* Efeito de hover */}
      <div className="absolute inset-0 rounded-2xl bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
    </div>
  );
};