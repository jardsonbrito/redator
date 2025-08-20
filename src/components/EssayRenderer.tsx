import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface EssayRendererProps {
  essayId: string;
  text: string;
  table: 'redacoes_enviadas' | 'redacoes_simulado' | 'redacoes_exercicio';
  imageUrl?: string | null;
  className?: string;
  onImageGenerated?: (imageUrl: string) => void;
}

export const EssayRenderer = ({ 
  essayId, 
  text, 
  table, 
  imageUrl: initialImageUrl, 
  className = "",
  onImageGenerated 
}: EssayRendererProps) => {
  const [imageUrl, setImageUrl] = useState<string | null>(initialImageUrl || null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Função interna para notificar quando a imagem for gerada
  const notifyImageGenerated = (url: string) => {
    setImageUrl(url);
    if (onImageGenerated) {
      onImageGenerated(url);
    }
  };

  useEffect(() => {
    // Se já tem imagem, não precisa gerar
    if (imageUrl) return;
    
    // Se não tem texto, não pode gerar
    if (!text || text.trim().length === 0) return;

    generateImage();
  }, [essayId, text, table]);

  const generateImage = async () => {
    if (isGenerating) return;
    
    setIsGenerating(true);
    setError(null);

    try {
      console.log('Generating image for essay:', essayId);
      
      const { data, error } = await supabase.functions.invoke('generate-essay-image', {
        body: {
          essayId,
          text,
          table
        }
      });

      if (error) {
        throw error;
      }

      if (data?.imageUrl) {
        console.log('Image generated successfully:', data.imageUrl);
        notifyImageGenerated(data.imageUrl);
      }
    } catch (err: any) {
      console.error('Error generating image:', err);
      setError(err.message || 'Erro ao gerar imagem');
    } finally {
      setIsGenerating(false);
    }
  };

  // Se está gerando, mostra loading
  if (isGenerating) {
    return (
      <div className={`flex items-center justify-center min-h-[200px] bg-muted/10 rounded-lg ${className}`}>
        <div className="text-center space-y-2">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="text-sm text-muted-foreground">Gerando imagem da redação...</p>
        </div>
      </div>
    );
  }

  // Se tem erro, mostra o texto original
  if (error) {
    console.warn('Fallback to text due to error:', error);
    return (
      <div className={`space-y-2 ${className}`}>
        <div className="text-xs text-destructive">Erro ao carregar imagem da redação</div>
        <div className="p-4 bg-muted/10 rounded-lg">
          {text.split('\n').map((paragraph, index) => (
            <p key={index} className="mb-2 last:mb-0">
              {paragraph || '\u00A0'}
            </p>
          ))}
        </div>
      </div>
    );
  }

  // Se tem imagem, mostra a imagem
  if (imageUrl) {
    return (
      <div className={`essay-image-container ${className}`}>
        <img 
          src={imageUrl} 
          alt="Redação renderizada"
          className="essay-rendered-image w-full h-auto object-contain"
          style={{ maxWidth: '100%', height: 'auto' }}
        />
      </div>
    );
  }

  // Fallback: mostra o texto enquanto não gera a imagem
  return (
    <div className={`space-y-2 ${className}`}>
      <div className="text-xs text-muted-foreground">Preparando visualização...</div>
      <div className="p-4 bg-muted/10 rounded-lg">
        {text.split('\n').map((paragraph, index) => (
          <p key={index} className="mb-2 last:mb-0">
            {paragraph || '\u00A0'}
          </p>
        ))}
      </div>
    </div>
  );
};