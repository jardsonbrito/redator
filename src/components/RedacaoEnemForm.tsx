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
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  // Controla o número de linhas baseado em quebras de linha
  const getLineCount = (text: string) => {
    if (!text) return 0;
    return text.split('\n').length;
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    const lineCount = getLineCount(newValue);
    
    if (lineCount > 30) {
      setShowAlert(true);
      setTimeout(() => setShowAlert(false), 3000);
      return;
    }
    
    onChange(newValue);
  };

  useEffect(() => {
    // Valida se há texto
    const valid = value.trim().length > 0;
    onValidChange(valid);
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
          className="relative bg-gradient-to-b from-purple-50/30 to-purple-50/10 rounded-xl shadow-lg border border-purple-100/50"
          style={{
            width: '100%',
            aspectRatio: '18/20', // 18cm x 20cm
            maxWidth: '720px', // 18cm * 40px/cm
            maxHeight: '800px', // 20cm * 40px/cm
            minHeight: '600px'
          }}
        >
          {/* Numeração das linhas */}
          <div 
            className="absolute left-0 top-0 flex flex-col justify-between text-gray-400 text-sm font-mono py-4"
            style={{
              width: '8.33%', // 0.5cm de 18cm = 2.77%, mas ajustado para melhor visualização
              height: '100%'
            }}
          >
            {lineNumbers.map((num) => (
              <div 
                key={num} 
                className="flex items-center justify-center text-xs"
                style={{ height: '3.33%' }} // 100% / 30 linhas
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
            {/* Linhas de fundo */}
            <div className="absolute inset-0 pointer-events-none">
              {lineNumbers.map((num) => (
                <div 
                  key={num}
                  className="absolute w-full border-b border-purple-200/40"
                  style={{
                    top: `${(num - 1) * 3.33}%`,
                    height: '3.33%'
                  }}
                />
              ))}
            </div>

            {/* Textarea sobreposto */}
            <textarea
              ref={textareaRef}
              value={value}
              onChange={handleChange}
              placeholder={placeholder}
              className="w-full h-full resize-none border-none outline-none bg-transparent text-gray-800 font-sans leading-relaxed p-0 pt-4"
              style={{
                fontSize: '16px',
                lineHeight: '26.4px', // Aproximadamente 0.66cm em pixels
                fontFamily: 'system-ui, -apple-system, sans-serif'
              }}
              spellCheck={false}
            />
          </div>
        </div>
        
        {/* Contador de linhas */}
        <div className="mt-2 text-center">
          <span className="text-sm text-gray-500">
            Linhas utilizadas: {getLineCount(value)}/30
          </span>
        </div>
      </div>
    </div>
  );
};