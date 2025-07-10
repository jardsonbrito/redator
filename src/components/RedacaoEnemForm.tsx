import { useState, useEffect, useRef } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";

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
  const [showAlert, setShowAlert] = useState(false);
  const [currentLines, setCurrentLines] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const isMobile = useIsMobile();
  
  // Conta palavras do texto
  const getWordCount = (text: string): number => {
    return text.trim().split(/\s+/).filter(word => word.length > 0).length;
  };

  // Calcula linhas baseado apenas em palavras para mobile (mais confiável)
  const getWordBasedLineCount = (text: string): number => {
    if (!text.trim()) return 0;
    
    // Estimativa simples: ~12 palavras por linha no formato ENEM
    const wordsPerLine = 12;
    const wordCount = getWordCount(text);
    return Math.ceil(wordCount / wordsPerLine);
  };
  
  // Calcula o número real de linhas visuais baseado no scrollHeight (desktop)
  const getVisualLineCount = (textarea: HTMLTextAreaElement | null): number => {
    if (!textarea || !textarea.value.trim()) return 0;
    
    // Força o recálculo do scrollHeight
    const originalHeight = textarea.style.height;
    textarea.style.height = 'auto';
    
    const lineHeight = 26.64; // Altura definida no CSS
    const paddingTop = 24; // Padding top definido
    const paddingBottom = 24; // Padding bottom definido
    
    // Calcula linhas baseado no scrollHeight real
    const contentHeight = textarea.scrollHeight - paddingTop - paddingBottom;
    const lines = Math.floor(contentHeight / lineHeight);
    
    // Restaura a altura original
    textarea.style.height = originalHeight;
    
    // Retorna pelo menos 1 linha se há conteúdo, mas não infla a contagem
    return Math.max(1, lines);
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const textarea = e.target;
    const newValue = textarea.value;
    
    // Temporariamente define o valor para calcular as linhas
    const prevValue = textarea.value;
    textarea.value = newValue;
    
    const wordCount = getWordCount(newValue);
    let currentLineCount: number;
    let isOverLimit: boolean;
    
    if (isMobile) {
      // No mobile, usa apenas contagem de palavras para evitar problemas de responsividade
      currentLineCount = getWordBasedLineCount(newValue);
      // Limite principal: 350 palavras (mais confiável que contagem visual)
      isOverLimit = wordCount > 350;
    } else {
      // No desktop, usa cálculo visual tradicional
      currentLineCount = getVisualLineCount(textarea);
      isOverLimit = currentLineCount > 30;
    }
    
    if (isOverLimit) {
      // Reverte para o valor anterior se exceder os limites
      textarea.value = prevValue;
      setShowAlert(true);
      setTimeout(() => setShowAlert(false), 3000);
      return;
    }
    
    setCurrentLines(currentLineCount);
    onChange(newValue);
  };

  useEffect(() => {
    // Atualiza o contador de linhas quando o valor muda
    let lines: number;
    
    if (isMobile) {
      // No mobile, usa estimativa baseada em palavras
      lines = getWordBasedLineCount(value);
    } else {
      // No desktop, usa cálculo visual
      if (textareaRef.current) {
        lines = getVisualLineCount(textareaRef.current);
      } else {
        lines = 0;
      }
    }
    
    setCurrentLines(lines);
    
    // Valida se há pelo menos 8 linhas preenchidas (ou ~96 palavras no mobile)
    const valid = isMobile ? getWordCount(value) >= 96 : lines >= 8;
    onValidChange(valid);
  }, [value, onValidChange, isMobile]);

  // Gera array de números de 1 a 30 para numeração
  const lineNumbers = Array.from({ length: 30 }, (_, i) => i + 1);

  return (
    <div className={`space-y-4 ${className}`}>
      {showAlert && (
        <Alert className="border-orange-200 bg-orange-50">
          <AlertTriangle className="h-4 w-4 text-orange-600" />
          <AlertDescription className="text-orange-800">
            {isMobile 
              ? "Você atingiu o limite de 350 palavras permitidas."
              : "Você atingiu o limite de linhas permitidas pela folha oficial."
            }
          </AlertDescription>
        </Alert>
      )}
      
      <div className="relative mx-auto max-w-4xl">
        {/* Container principal com proporções da folha ENEM */}
        <div 
          className={`relative bg-white rounded-xl shadow-lg border border-gray-200 ${
            isMobile ? 'w-full' : ''
          }`}
          style={{
            width: '100%',
            aspectRatio: isMobile ? 'auto' : '18/20', // No mobile, permite altura automática
            maxWidth: isMobile ? '100%' : '720px',
            height: isMobile ? 'auto' : '848px', // No mobile, altura automática
            minHeight: isMobile ? '600px' : '848px' // Altura mínima menor no mobile
          }}
        >
          {/* Numeração das linhas */}
          <div 
            className={`absolute left-0 top-0 flex flex-col justify-start text-gray-500 font-mono ${
              isMobile ? 'text-xs' : 'text-sm'
            }`}
            style={{
              width: isMobile ? '12%' : '8.33%', // Mais espaço no mobile
              height: '100%',
              paddingTop: '24px'
            }}
          >
            {lineNumbers.map((num) => (
              <div 
                key={num} 
                className="flex items-center justify-center text-xs"
                style={{ 
                  height: '26.64px', // Mesma altura do line-height do texto
                  lineHeight: '26.64px'
                }}
              >
                {num}
              </div>
            ))}
          </div>

          {/* Área de escrita */}
          <div 
            className="absolute right-0 top-0 h-full"
            style={{
              width: isMobile ? '88%' : '91.67%', // Menos espaço no mobile para compensar numeração
              paddingLeft: isMobile ? '4px' : '8px',
              paddingRight: isMobile ? '4px' : '8px'
            }}
          >
            {/* Linhas de fundo - exatamente 30 linhas */}
            <div className="absolute inset-0 pointer-events-none">
              {lineNumbers.map((num) => (
                <div 
                  key={num}
                  className="absolute w-full"
                  style={{
                    top: `${24 + (num - 1) * 26.64 + 20}px`, // Posição da linha na base do texto
                    height: '1px',
                    backgroundColor: 'rgba(0, 0, 0, 0.25)', // Linha preta com 25% de opacidade
                    borderBottom: '1px solid rgba(0, 0, 0, 0.25)'
                  }}
                />
              ))}
            </div>

            {/* Textarea sobreposto */}
            <textarea
              ref={textareaRef}
              value={value}
              onChange={handleChange}
              onKeyDown={(e) => {
                // Permite apenas backspace/delete quando no limite
                const wordCount = getWordCount(value);
                const isAtLimit = isMobile 
                  ? wordCount >= 350  // No mobile, só considera palavras
                  : currentLines >= 30; // No desktop, considera linhas visuais
                  
                  
                if (isAtLimit && 
                    e.key !== 'Backspace' && 
                    e.key !== 'Delete' && 
                    e.key !== 'ArrowLeft' && 
                    e.key !== 'ArrowRight' && 
                    e.key !== 'ArrowUp' && 
                    e.key !== 'ArrowDown') {
                  e.preventDefault();
                }
              }}
              placeholder={placeholder}
              className="w-full h-full resize-none border-none outline-none bg-transparent text-gray-900 font-sans p-0 overflow-hidden"
              style={{
                fontSize: isMobile ? '14px' : '16px', // Fonte menor no mobile
                lineHeight: '26.64px',
                fontFamily: 'system-ui, -apple-system, sans-serif',
                paddingTop: '24px',
                paddingBottom: '24px'
              }}
              spellCheck={false}
            />
          </div>
        </div>
        
        {/* Contador adaptado para mobile */}
        <div className="mt-4 text-center">
          <span className="text-sm text-gray-500">
            {isMobile ? (
              <>
                Palavras: {getWordCount(value)}/350 
                <span className="ml-2 text-xs">({currentLines} linhas aprox.)</span>
              </>
            ) : (
              <>Linhas utilizadas: {currentLines}/30</>
            )}
          </span>
        </div>
      </div>
    </div>
  );
};