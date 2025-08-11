import { ButtonHTMLAttributes, forwardRef } from "react";
import {
  Pencil, Trash2, Eye, EyeOff, PlayCircle, PauseCircle, Power,
  Download, FileDown, ExternalLink, BarChart3, UserCog,
  SquareMousePointer, MessageSquareText, Loader2, LucideIcon
} from "lucide-react";
import { cn } from "@/lib/utils";

type Intent = "neutral" | "positive" | "attention" | "danger" | "blue";
type Density = "compact" | "standard" | "expanded";

const intentToClass: Record<Intent, string> = {
  neutral: "text-[var(--color-neutral)] hover:text-[var(--color-brand)]",
  positive: "text-[var(--color-positive)] hover:text-[var(--color-brand)]",
  attention: "text-[var(--color-attention)] hover:text-[var(--color-brand)]",
  danger: "text-[var(--color-danger)] hover:text-[var(--color-brand)]",
  blue: "text-[var(--color-blue)] hover:text-[var(--color-brand)]",
};

interface IconActionProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: LucideIcon;
  label: string;
  intent?: Intent;
  size?: number;        // 20 ou 24
  loading?: boolean;    // exibe spinner e desabilita
  asSwitch?: boolean;   // para toggles com aria-checked
  checked?: boolean;    // estado do switch (quando asSwitch)
  density?: Density;    // compact, standard, expanded
  disabledReason?: string; // motivo para tooltip quando desabilitado
}

export const IconAction = forwardRef<HTMLButtonElement, IconActionProps>(({
  icon: Icon,
  label,
  intent = "neutral",
  size = 20,
  loading = false,
  asSwitch = false,
  checked,
  disabled,
  density = "standard",
  disabledReason,
  className,
  ...props
}, ref) => {
  const isDisabled = disabled || loading;
  const showText = density !== "compact";
  const tooltipText = isDisabled && disabledReason ? disabledReason : label;

  return (
    <button
      ref={ref}
      type="button"
      {...props}
      className={cn(
        "inline-flex items-center gap-2 px-3 py-2 rounded-md min-h-[40px] min-w-[40px]",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
        "focus-visible:ring-[var(--focus-ring)]",
        "disabled:opacity-[var(--disabled-opacity)] disabled:cursor-not-allowed",
        "transition-colors duration-200",
        "@media (prefers-reduced-motion: reduce) { transition: none }",
        intentToClass[intent],
        className
      )}
      aria-label={label}
      title={tooltipText}
      aria-busy={loading || undefined}
      aria-disabled={isDisabled || undefined}
      role={asSwitch ? "switch" : undefined}
      aria-checked={asSwitch && typeof checked === "boolean" ? checked : undefined}
      disabled={isDisabled}
    >
      {loading ? (
        <Loader2 
          className="shrink-0 animate-spin" 
          size={size}
          aria-hidden="true" 
        />
      ) : (
        <Icon 
          className="shrink-0" 
          size={size}
          strokeWidth={2} 
          aria-hidden="true" 
        />
      )}
      {showText && <span className="text-sm font-medium">{label}</span>}
    </button>
  );
});

IconAction.displayName = "IconAction";

export const ACTION_ICON = {
  editar: Pencil,
  excluir: Trash2,
  desativar: PauseCircle,
  ativar: PlayCircle,
  power: Power,
  publicar: Eye,
  rascunho: EyeOff,
  visualizar: SquareMousePointer,
  download: Download,
  exportar: FileDown,
  externo: ExternalLink,
  estatisticas: BarChart3,
  gerenciarUsuario: UserCog,
  mensagens: MessageSquareText,
} as const;

export type ActionIconType = keyof typeof ACTION_ICON;