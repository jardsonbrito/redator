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
  // Paleta harmonizada baseada nos cards do aluno (tons roxos/lilás com gradientes)
  const getCardStyle = (index: number) => {
    const styles = [
      { bg: "bg-gradient-to-br from-purple-600 to-purple-400", text: "text-white", hover: "hover:from-purple-700 hover:to-purple-500" },
      { bg: "bg-gradient-to-br from-violet-600 to-violet-400", text: "text-white", hover: "hover:from-violet-700 hover:to-violet-500" },
      { bg: "bg-gradient-to-br from-indigo-600 to-indigo-400", text: "text-white", hover: "hover:from-indigo-700 hover:to-indigo-500" },
      { bg: "bg-gradient-to-br from-blue-600 to-blue-400", text: "text-white", hover: "hover:from-blue-700 hover:to-blue-500" },
      { bg: "bg-gradient-to-br from-cyan-600 to-cyan-400", text: "text-white", hover: "hover:from-cyan-700 hover:to-cyan-500" },
      { bg: "bg-gradient-to-br from-teal-600 to-teal-400", text: "text-white", hover: "hover:from-teal-700 hover:to-teal-500" },
      { bg: "bg-gradient-to-br from-emerald-600 to-emerald-400", text: "text-white", hover: "hover:from-emerald-700 hover:to-emerald-500" },
      { bg: "bg-gradient-to-br from-green-600 to-green-400", text: "text-white", hover: "hover:from-green-700 hover:to-green-500" },
      { bg: "bg-gradient-to-br from-lime-600 to-lime-400", text: "text-white", hover: "hover:from-lime-700 hover:to-lime-500" },
      { bg: "bg-gradient-to-br from-yellow-600 to-yellow-400", text: "text-white", hover: "hover:from-yellow-700 hover:to-yellow-500" },
      { bg: "bg-gradient-to-br from-orange-600 to-orange-400", text: "text-white", hover: "hover:from-orange-700 hover:to-orange-500" },
      { bg: "bg-gradient-to-br from-red-600 to-red-400", text: "text-white", hover: "hover:from-red-700 hover:to-red-500" },
      { bg: "bg-gradient-to-br from-pink-600 to-pink-400", text: "text-white", hover: "hover:from-pink-700 hover:to-pink-500" },
      { bg: "bg-gradient-to-br from-rose-600 to-rose-400", text: "text-white", hover: "hover:from-rose-700 hover:to-rose-500" },
      { bg: "bg-gradient-to-br from-fuchsia-600 to-fuchsia-400", text: "text-white", hover: "hover:from-fuchsia-700 hover:to-fuchsia-500" },
      { bg: "bg-gradient-to-br from-purple-500 to-pink-500", text: "text-white", hover: "hover:from-purple-600 hover:to-pink-600" },
      { bg: "bg-gradient-to-br from-blue-500 to-cyan-500", text: "text-white", hover: "hover:from-blue-600 hover:to-cyan-600" },
      { bg: "bg-gradient-to-br from-green-500 to-teal-500", text: "text-white", hover: "hover:from-green-600 hover:to-teal-600" },
      { bg: "bg-gradient-to-br from-orange-500 to-red-500", text: "text-white", hover: "hover:from-orange-600 hover:to-red-600" },
      { bg: "bg-gradient-to-br from-violet-500 to-purple-500", text: "text-white", hover: "hover:from-violet-600 hover:to-purple-600" },
      { bg: "bg-gradient-to-br from-indigo-500 to-blue-500", text: "text-white", hover: "hover:from-indigo-600 hover:to-blue-600" },
      { bg: "bg-gradient-to-br from-slate-600 to-slate-400", text: "text-white", hover: "hover:from-slate-700 hover:to-slate-500" },
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