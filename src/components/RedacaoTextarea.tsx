
import { useEffect } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

interface RedacaoTextareaProps {
  value: string;
  onChange: (value: string) => void;
  onValidChange: (isValid: boolean) => void;
  className?: string;
  placeholder?: string;
}

export const RedacaoTextarea = ({ 
  value, 
  onChange, 
  onValidChange, 
  className = "", 
  placeholder = "Escreva sua redação completa aqui..." 
}: RedacaoTextareaProps) => {
  useEffect(() => {
    // Valida apenas se há texto
    const valid = value.trim().length > 0;
    onValidChange(valid);
  }, [value, onValidChange]);

  return (
    <div className="space-y-2">
      <Textarea
        id="redacao-texto"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`min-h-[400px] border-redator-accent/30 focus:border-redator-accent resize-y ${className}`}
      />
    </div>
  );
};
