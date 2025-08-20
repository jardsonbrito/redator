import { useEffect, useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useEssayImageGeneration } from "@/hooks/useEssayImageGeneration";

interface RedacaoTextareaSimplesProps {
  value: string;
  onChange: (value: string) => void;
  onValidChange: (isValid: boolean) => void;
  className?: string;
  placeholder?: string;
  essayId?: string;
  table?: 'redacoes_enviadas' | 'redacoes_simulado' | 'redacoes_exercicio';
  generateImage?: boolean;
}

export const RedacaoTextareaSimples = ({ 
  value, 
  onChange, 
  onValidChange, 
  className = "", 
  placeholder = "Escreva sua redação completa aqui...",
  essayId,
  table,
  generateImage = false
}: RedacaoTextareaSimplesProps) => {
  const [wordCount, setWordCount] = useState(0);

  // Hook para gerar imagem da redação automaticamente
  useEssayImageGeneration({
    text: value,
    essayId: essayId || '',
    table: table || 'redacoes_enviadas',
    enabled: generateImage && !!essayId && !!table
  });

  // Conta palavras do texto
  const getWordCount = (text: string): number => {
    return text.trim().split(/\s+/).filter(word => word.length > 0).length;
  };

  useEffect(() => {
    // Atualiza a contagem de palavras
    const count = getWordCount(value);
    setWordCount(count);
    
    // Valida se há texto
    const valid = value.trim().length > 0;
    onValidChange(valid);
  }, [value, onValidChange]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange(e.target.value);
  };

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <Label htmlFor="redacao-texto" className="text-sm font-medium text-redator-primary">
          Texto da Redação *
        </Label>
        <div className="text-xs text-redator-accent">
          {wordCount} palavras
        </div>
      </div>
      
      <Textarea
        id="redacao-texto"
        placeholder={placeholder}
        value={value}
        onChange={handleChange}
        className={`min-h-[400px] w-full resize-y border-redator-accent/30 focus:border-redator-accent ${className}`}
      />
      
      {wordCount > 0 && (
        <div className="text-xs text-redator-accent">
          Palavras: {wordCount} • {wordCount < 400 ? 'Recomendamos pelo menos 400 palavras' : 'Quantidade adequada'}
        </div>
      )}
    </div>
  );
};