import { Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface FraseCurtidaButtonProps {
  totalCurtidas: number;
  usuarioCurtiu: boolean;
  onCurtir: () => void;
  isCurtindo?: boolean;
  disabled?: boolean;
  isPropriaFrase?: boolean;
}

export const FraseCurtidaButton = ({
  totalCurtidas,
  usuarioCurtiu,
  onCurtir,
  isCurtindo = false,
  disabled = false,
  isPropriaFrase = false,
}: FraseCurtidaButtonProps) => {
  const tooltipText = isPropriaFrase
    ? "Você não pode curtir sua própria frase"
    : usuarioCurtiu
    ? "Remover curtida"
    : "Curtir esta frase";

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={onCurtir}
      disabled={disabled || isCurtindo || isPropriaFrase}
      className={cn(
        "gap-1.5 px-2 h-8 transition-all",
        usuarioCurtiu && "text-red-500 hover:text-red-600",
        isPropriaFrase && "opacity-50 cursor-not-allowed"
      )}
      title={tooltipText}
    >
      <Heart
        className={cn(
          "h-4 w-4 transition-all",
          usuarioCurtiu && "fill-current",
          isCurtindo && "animate-pulse"
        )}
      />
      <span className="text-sm font-medium">{totalCurtidas}</span>
    </Button>
  );
};
