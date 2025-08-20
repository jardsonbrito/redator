import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface UseEssayImageGenerationProps {
  text: string;
  essayId: string;
  table: 'redacoes_enviadas' | 'redacoes_simulado' | 'redacoes_exercicio';
  enabled?: boolean;
}

export const useEssayImageGeneration = ({ 
  text, 
  essayId, 
  table, 
  enabled = true 
}: UseEssayImageGenerationProps) => {
  
  useEffect(() => {
    if (!enabled || !text || !essayId || text.trim().length === 0) {
      return;
    }

    const generateImage = async () => {
      try {
        console.log('Triggering essay image generation for:', essayId);
        
        const { data, error } = await supabase.functions.invoke('generate-essay-image', {
          body: {
            essayId,
            text,
            table
          }
        });

        if (error) {
          console.error('Error generating essay image:', error);
          return;
        }

        console.log('Essay image generated successfully:', data);
      } catch (error) {
        console.error('Error invoking essay image generation:', error);
      }
    };

    // Generate image after a small delay to ensure essay is saved
    const timeoutId = setTimeout(generateImage, 1000);

    return () => clearTimeout(timeoutId);
  }, [text, essayId, table, enabled]);
};