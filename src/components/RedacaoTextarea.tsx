
import { useEffect, useRef } from "react";
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
  placeholder = "Escreva sua redação aqui..." 
}: RedacaoTextareaProps) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Conta palavras do texto
  const getWordCount = (text: string): number => {
    if (!text.trim()) return 0;
    return text.trim().split(/\s+/).filter(word => word.length > 0).length;
  };

  // Auto-resize textarea
  const adjustTextareaHeight = () => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.max(textarea.scrollHeight, 192)}px`; // Mínimo 6 linhas (32px * 6)
    }
  };

  useEffect(() => {
    adjustTextareaHeight();
    
    // Valida apenas se há texto
    const valid = value.trim().length > 0;
    onValidChange(valid);
  }, [value, onValidChange]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange(e.target.value);
    // Pequeno delay para garantir que o DOM foi atualizado
    setTimeout(adjustTextareaHeight, 0);
  };

  const wordCount = getWordCount(value);

  return (
    <div className={`space-y-2 ${className}`}>
      <Label htmlFor="redacao-texto" className="text-sm font-medium text-foreground">
        Texto da Redação
      </Label>
      <div className="relative">
        <Textarea
          ref={textareaRef}
          id="redacao-texto"
          placeholder={placeholder}
          value={value}
          onChange={handleChange}
          className="w-full resize-none overflow-hidden rounded-2xl border p-4 leading-relaxed min-h-[192px] focus:border-primary"
          style={{
            fontSize: '16px',
            lineHeight: '1.6',
            fontFamily: 'system-ui, -apple-system, sans-serif'
          }}
          wrap="soft"
          aria-describedby="word-count"
        />
        <div 
          id="word-count"
          className="text-sm text-muted-foreground mt-2 w-full text-right"
        >
          Palavras: {wordCount}
        </div>
      </div>
    </div>
  );
};
