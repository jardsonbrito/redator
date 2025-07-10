import { useState, useEffect, useRef } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle } from "lucide-react";

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
  
  // Calcula o número real de linhas visuais baseado no scrollHeight
  const getVisualLineCount = (textarea: HTMLTextAreaElement | null): number => {
    if (!textarea) return 0;
    
    const lineHeight = 26.64; // Altura definida no CSS
    const paddingTop = 24; // Padding top definido
    const paddingBottom = 24; // Padding bottom definido
    
    // Calcula linhas baseado no scrollHeight
    const contentHeight = textarea.scrollHeight - paddingTop - paddingBottom;
    const lines = Math.ceil(contentHeight / lineHeight);
    
    return Math.max(1, lines); // Mínimo 1 linha
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const textarea = e.target;
    const newValue = textarea.value;
    
    // Temporariamente define o valor para calcular as linhas
    const prevValue = textarea.value;
    textarea.value = newValue;
    
    const visualLines = getVisualLineCount(textarea);
    
    if (visualLines > 30) {
      // Reverte para o valor anterior se exceder 30 linhas
      textarea.value = prevValue;
      setShowAlert(true);
      setTimeout(() => setShowAlert(false), 3000);
      return;
    }
    
    setCurrentLines(visualLines);
    onChange(newValue);
  };

  useEffect(() => {
    // Valida se há texto
    const valid = value.trim().length > 0;
    onValidChange(valid);
    
    // Atualiza o contador de linhas quando o valor muda
    if (textareaRef.current) {
      const lines = getVisualLineCount(textareaRef.current);
      setCurrentLines(lines);
    }
  }, [value, onValidChange]);

  // Gera array de números de 1 a 30 para numeração
  const lineNumbers = Array.from({ length: 30 }, (_, i) => i + 1);

  return (
    <div className={`space-y-4 ${className}`}>
      {showAlert && (
        <Alert className="border-orange-200 bg-orange-50">
          <AlertTriangle className="h-4 w-4 text-orange-600" />
          <AlertDescription className="text-orange-800">
            Você atingiu o limite de linhas permitidas pela folha oficial.
          </AlertDescription>
        </Alert>
      )}
      
      <div className="relative mx-auto max-w-4xl">
        {/* Container principal com proporções da folha ENEM */}
        <div 
          className="relative bg-white rounded-xl shadow-lg border border-gray-200"
          style={{
            width: '100%',
            aspectRatio: '18/20', // 18cm x 20cm
            maxWidth: '720px', // 18cm * 40px/cm
            height: '848px', // Altura fixa para garantir que todas as 30 linhas caibam (24px + 30*26.64px + 24px)
            minHeight: '848px'
          }}
        >
          {/* Numeração das linhas */}
          <div 
            className="absolute left-0 top-0 flex flex-col justify-start text-gray-500 text-sm font-mono"
            style={{
              width: '8.33%', // 0.5cm de 18cm
              height: '100%',
              paddingTop: '24px' // Alinhamento inicial
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
              width: '91.67%', // 17.5cm de 18cm
              paddingLeft: '8px',
              paddingRight: '8px'
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
                if (currentLines >= 30 && 
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
                fontSize: '16px',
                lineHeight: '26.64px', // Altura exata de cada linha
                fontFamily: 'system-ui, -apple-system, sans-serif',
                paddingTop: '24px', // Alinhamento com a numeração
                paddingBottom: '24px'
              }}
              spellCheck={false}
            />
          </div>
        </div>
        
        {/* Contador de linhas */}
        <div className="mt-4 text-center">
          <span className="text-sm text-gray-500">
            Linhas utilizadas: {currentLines}/30
          </span>
        </div>
      </div>
    </div>
  );
};