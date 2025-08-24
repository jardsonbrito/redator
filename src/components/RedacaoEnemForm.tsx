
import { useState, useEffect, useRef } from "react";
import { Label } from "@/components/ui/label";

interface RedacaoEnemFormProps {
  value: string;
  onChange: (value: string) => void;
  onValidChange: (isValid: boolean) => void;
  className?: string;
  placeholder?: string;
}

export const RedacaoEnemForm = ({ 
  value, 
  onChange, 
  onValidChange, 
  className = "", 
  placeholder = "Escreva sua redação aqui..." 
}: RedacaoEnemFormProps) => {
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
      textarea.style.height = `${Math.max(textarea.scrollHeight, 192)}px`; // Mínimo 6 linhas
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    onChange(newValue);
    // Pequeno delay para garantir que o DOM foi atualizado
    setTimeout(adjustTextareaHeight, 0);
  };

  useEffect(() => {
    adjustTextareaHeight();
    
    // Valida apenas se há texto
    const valid = value.trim().length > 0;
    onValidChange(valid);
  }, [value, onValidChange]);

  const wordCount = getWordCount(value);

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="w-full max-w-4xl mx-auto">
        <Label htmlFor="redacao-textarea" className="text-sm font-medium text-foreground mb-2 block">
          Texto da Redação
        </Label>
        <div className="relative">
          <textarea
            ref={textareaRef}
            id="redacao-textarea"
            value={value}
            onChange={handleChange}
            placeholder={placeholder}
            className="w-full resize-none overflow-hidden rounded-2xl border p-4 leading-relaxed border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent min-h-[192px]"
            style={{
              fontSize: '16px',
              lineHeight: '1.6',
              fontFamily: 'system-ui, -apple-system, sans-serif'
            }}
            wrap="soft"
            spellCheck={false}
            aria-describedby="word-count-enem"
          />
          <div 
            id="word-count-enem"
            className="text-sm text-muted-foreground mt-2 w-full text-right"
          >
            Palavras: {wordCount}
          </div>
        </div>
      </div>
    </div>
  );
};
