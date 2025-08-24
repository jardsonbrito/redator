import { ButtonHTMLAttributes, forwardRef } from "react";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type Intent = "neutral" | "positive" | "attention" | "danger";

const intentToClass: Record<Intent, string> = {
  neutral: "text-gray-600 bg-gray-100 hover:bg-gray-200 hover:text-gray-700",
  positive: "text-green-600 bg-green-100 hover:bg-green-200 hover:text-green-700", 
  attention: "text-yellow-600 bg-yellow-100 hover:bg-yellow-200 hover:text-yellow-700",
  danger: "text-red-600 bg-red-100 hover:bg-red-200 hover:text-red-700",
};

interface CompactIconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: LucideIcon;
  label: string;
  intent?: Intent;
}

export const CompactIconButton = forwardRef<HTMLButtonElement, CompactIconButtonProps>(({
  icon: Icon,
  label,
  intent = "neutral",
  className,
  ...props
}, ref) => {
  return (
    <button
      ref={ref}
      type="button"
      {...props}
      className={cn(
        "inline-flex items-center justify-center w-10 h-10 rounded-lg border-0 transition-colors duration-200",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-500",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        intentToClass[intent],
        className
      )}
      aria-label={label}
      title={label}
    >
      <Icon className="w-5 h-5" strokeWidth={2} aria-hidden="true" />
    </button>
  );
});

CompactIconButton.displayName = "CompactIconButton";