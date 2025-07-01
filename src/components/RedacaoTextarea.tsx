
import { useState, useEffect } from "react";
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
  const [lineCount, setLineCount] = useState(0);
  const [isValid, setIsValid] = useState(false);

  useEffect(() => {
    // Conta as linhas não vazias
    const lines = value.split('\n').filter(line => line.trim().length > 0);
    setLineCount(lines.length);
    
    // Valida se está entre 7 e 30 linhas
    const valid = lines.length >= 7 && lines.length <= 30;
    setIsValid(valid);
    onValidChange(valid);
  }, [value, onValidChange]);

  const getStatusMessage = () => {
    if (lineCount < 7) {
      return "Sua redação precisa ter no mínimo 7 linhas.";
    }
    if (lineCount > 30) {
      return "Sua redação ultrapassou o limite de 30 linhas.";
    }
    return "";
  };

  const getStatusColor = () => {
    if (lineCount < 7) return "text-red-600";
    if (lineCount > 30) return "text-red-600";
    return "text-green-600";
  };

  return (
    <div className="space-y-2">
      <Label htmlFor="redacao-texto" className="text-redator-primary font-medium">
        Texto da Redação *
      </Label>
      <Textarea
        id="redacao-texto"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`min-h-[400px] border-redator-accent/30 focus:border-redator-accent resize-y ${className}`}
      />
      <div className="flex justify-between items-center">
        <p className={`text-sm font-medium ${getStatusColor()}`}>
          {lineCount}/30 linhas
        </p>
        {getStatusMessage() && (
          <p className="text-sm text-red-600">
            {getStatusMessage()}
          </p>
        )}
      </div>
    </div>
  );
};
