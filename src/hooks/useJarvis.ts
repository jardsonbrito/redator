import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useJarvisCredits } from '@/hooks/useJarvisCredits';
import { useCredits } from '@/hooks/useCredits';
import type { CampoResposta } from '@/hooks/useJarvisModos';

export interface JarvisModoInfo {
  id: string;
  nome: string;
  label: string;
  campos_resposta: CampoResposta[];
}

export interface JarvisMetadata {
  palavras_original: number;
  palavras_melhorada: number | null;
  tempo_resposta_ms: number;
  modelo: string;
  tokens_usados?: number;
  custo_estimado_usd?: number;
}

interface UseJarvisReturn {
  analisar: (texto: string, modoId: string) => Promise<Record<string, string> | null>;
  isLoading: boolean;
  currentResponse: Record<string, string> | null;
  currentModo: JarvisModoInfo | null;
  currentMetadata: JarvisMetadata | null;
  credits: number;
  essayCredits: number;
  clearResponse: () => void;
}

export const useJarvis = (userEmail: string): UseJarvisReturn => {
  const [isLoading, setIsLoading] = useState(false);
  const [currentResponse, setCurrentResponse] = useState<Record<string, string> | null>(null);
  const [currentModo, setCurrentModo] = useState<JarvisModoInfo | null>(null);
  const [currentMetadata, setCurrentMetadata] = useState<JarvisMetadata | null>(null);
  const { toast } = useToast();
  const { credits, refreshCredits } = useJarvisCredits(userEmail);
  const { credits: essayCredits, refreshCredits: refreshEssayCredits } = useCredits(userEmail);

  const analisar = async (texto: string, modoId: string): Promise<Record<string, string> | null> => {
    if (!texto.trim()) {
      toast({ title: "Texto vazio", description: "Digite algo para análise", variant: "destructive" });
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

    // Prioridade: crédito Jarvis → crédito de redação como fallback
    if (credits < 1 && essayCredits < 1) {
      toast({
        title: "Créditos insuficientes",
        description: "Você não tem créditos suficientes. Entre em contato pelo WhatsApp (85) 99216-0605 para solicitar a compra de créditos.",
        variant: "destructive"
      });
      return null;
    }

    // Aviso antes da chamada quando o fallback será usado
    if (credits < 1 && essayCredits >= 1) {
      toast({
        title: "Sem créditos Jarvis",
        description: "Você está sem créditos do Jarvis. Esta análise utilizará 1 crédito de redação.",
        className: "border-amber-200 bg-amber-50 text-amber-900",
        duration: 6000
      });
    }

    setIsLoading(true);

    try {
      console.log('🤖 Enviando texto para análise Jarvis... Modo:', modoId);

      const { data, error } = await supabase.functions.invoke('jarvis-assistant', {
        body: { texto, userEmail, modo_id: modoId }
      });

      if (error) {
        console.error('❌ Erro ao chamar Edge Function:', error);
        let mensagemReal: string | null = null;
        try {
          const body = await (error as any).context?.json?.();
          mensagemReal = body?.error ?? null;
        } catch { /* ignora */ }
        throw new Error(mensagemReal ?? error.message);
      }

      if (!data.success) {
        throw new Error(data.error || 'Erro desconhecido');
      }

      console.log('✅ Resposta recebida:', data);

      setCurrentResponse(data.resposta);
      setCurrentModo(data.modo);
      setCurrentMetadata(data.metadados);

      if (data.usou_credito_redacao) {
        toast({
          title: "✅ Análise concluída!",
          description: `1 crédito de redação utilizado • Saldo restante: ${data.redacao_creditos_restantes} crédito(s) de redação`,
          className: "border-amber-200 bg-amber-50 text-amber-900"
        });
        await refreshEssayCredits();
        window.dispatchEvent(new CustomEvent('credits-updated', {
          detail: {
            userEmail: userEmail.toLowerCase().trim(),
            newCredits: data.redacao_creditos_restantes
          }
        }));
      } else {
        toast({
          title: "✅ Análise concluída!",
          description: `${data.jarvis_creditos_restantes} créditos Jarvis restantes`,
          className: "border-green-200 bg-green-50 text-green-900"
        });
      }

      await refreshCredits();

      window.dispatchEvent(new CustomEvent('jarvis-credits-updated', {
        detail: {
          userEmail: userEmail.toLowerCase().trim(),
          newCredits: data.jarvis_creditos_restantes ?? credits
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
        errorMessage = 'Você não tem créditos suficientes. Entre em contato pelo WhatsApp (85) 99216-0605 para solicitar a compra de créditos.';
      } else if (err.message?.includes('400') || err.message?.includes('muito longo')) {
        errorTitle = 'Texto inválido';
        errorMessage = 'Seu texto excede o limite de 500 palavras.';
      }

      toast({ title: errorTitle, description: errorMessage, variant: "destructive" });
      return null;

    } finally {
      setIsLoading(false);
    }
  };

  const clearResponse = () => {
    setCurrentResponse(null);
    setCurrentModo(null);
    setCurrentMetadata(null);
  };

  return {
    analisar,
    isLoading,
    currentResponse,
    currentModo,
    currentMetadata,
    credits,
    essayCredits,
    clearResponse
  };
};
