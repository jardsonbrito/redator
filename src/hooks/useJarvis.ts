import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useJarvisCredits } from '@/hooks/useJarvisCredits';

export interface JarvisResponse {
  diagnostico: string;
  explicacao: string;
  sugestao_reescrita: string;
  versao_melhorada: string;
}

export interface JarvisMetadata {
  palavras_original: number;
  palavras_melhorada: number;
  tempo_resposta_ms: number;
  modelo: string;
  tokens_usados?: number;
  custo_estimado_usd?: number;
}

interface UseJarvisReturn {
  analisar: (texto: string) => Promise<JarvisResponse | null>;
  isLoading: boolean;
  currentResponse: JarvisResponse | null;
  currentMetadata: JarvisMetadata | null;
  credits: number;
  clearResponse: () => void;
}

export const useJarvis = (userEmail: string): UseJarvisReturn => {
  const [isLoading, setIsLoading] = useState(false);
  const [currentResponse, setCurrentResponse] = useState<JarvisResponse | null>(null);
  const [currentMetadata, setCurrentMetadata] = useState<JarvisMetadata | null>(null);
  const { toast } = useToast();
  const { credits, refreshCredits } = useJarvisCredits(userEmail);

  const analisar = async (texto: string): Promise<JarvisResponse | null> => {
    // Validações básicas
    if (!texto.trim()) {
      toast({
        title: "Texto vazio",
        description: "Digite algo para análise",
        variant: "destructive"
      });
      return null;
    }

    const palavras = texto.trim().split(/\s+/).length;

    if (palavras > 500) {
      toast({
        title: "Texto muito longo",
        description: `Máximo de 500 palavras. Seu texto tem ${palavras} palavras.`,
        variant: "destructive"
      });
      return null;
    }

    if (palavras < 5) {
      toast({
        title: "Texto muito curto",
        description: "Digite pelo menos 5 palavras para uma análise adequada.",
        variant: "destructive"
      });
      return null;
    }

    if (credits < 1) {
      toast({
        title: "Créditos insuficientes",
        description: "Você precisa de 1 crédito Jarvis para fazer uma análise",
        variant: "destructive"
      });
      return null;
    }

    setIsLoading(true);

    try {
      console.log('🤖 Enviando texto para análise Jarvis...');

      const { data, error } = await supabase.functions.invoke('jarvis-assistant', {
        body: { texto, userEmail }
      });

      if (error) {
        console.error('❌ Erro ao chamar Edge Function:', error);
        throw error;
      }

      if (!data.success) {
        throw new Error(data.error || 'Erro desconhecido');
      }

      console.log('✅ Resposta recebida:', data);

      setCurrentResponse(data.resposta);
      setCurrentMetadata(data.metadados);

      toast({
        title: "✅ Análise concluída!",
        description: `${data.jarvis_creditos_restantes} créditos Jarvis restantes`,
        className: "border-green-200 bg-green-50 text-green-900"
      });

      // Atualizar créditos
      await refreshCredits();

      // Disparar evento personalizado
      window.dispatchEvent(new CustomEvent('jarvis-credits-updated', {
        detail: {
          userEmail: userEmail.toLowerCase().trim(),
          newCredits: data.jarvis_creditos_restantes
        }
      }));

      return data.resposta;

    } catch (err: any) {
      console.error('💥 Erro ao chamar Jarvis:', err);

      let errorMessage = 'Erro ao processar análise';
      let errorTitle = 'Erro';

      if (err.message?.includes('429') || err.message?.includes('Limite')) {
        errorTitle = 'Limite atingido';
        errorMessage = 'Você atingiu o limite de 5 consultas por hora. Tente novamente mais tarde.';
      } else if (err.message?.includes('402') || err.message?.includes('insuficientes')) {
        errorTitle = 'Créditos insuficientes';
        errorMessage = 'Você não tem créditos Jarvis suficientes para esta análise.';
      } else if (err.message?.includes('400') || err.message?.includes('muito longo')) {
        errorTitle = 'Texto inválido';
        errorMessage = 'Seu texto excede o limite de 500 palavras.';
      }

      toast({
        title: errorTitle,
        description: errorMessage,
        variant: "destructive"
      });

      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const clearResponse = () => {
    setCurrentResponse(null);
    setCurrentMetadata(null);
  };

  return {
    analisar,
    isLoading,
    currentResponse,
    currentMetadata,
    credits,
    clearResponse
  };
};
