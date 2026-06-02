import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useJarvisCredits } from '@/hooks/useJarvisCredits';
import { useToast } from '@/hooks/use-toast';

export interface TutorMensagem {
  id:           string;
  role:         'user' | 'assistant';
  conteudo:     string;
  tokens_total: number | null;
  created_at:   string;
}

interface UseTutorChatReturn {
  mensagens:        TutorMensagem[];
  isLoading:        boolean;
  enviar:           (texto: string) => Promise<string | null>;
  creditosRestantes: number;
  acumuladorTokens: number;
}

export const useTutorChat = (
  alunoEmail:            string,
  conversationId:        string | null,
  onConversationCreated?: (id: string) => void,
  subtabId?:             string | null,
): UseTutorChatReturn => {
  const [mensagens, setMensagens]           = useState<TutorMensagem[]>([]);
  const [isLoading, setIsLoading]           = useState(false);
  const [acumuladorTokens, setAcumulador]   = useState(0);
  const { credits, refreshCredits }         = useJarvisCredits(alunoEmail);
  const { toast }                           = useToast();

  const carregarMensagens = useCallback(async (convId: string) => {
    try {
      const { data, error } = await supabase.rpc('get_tutor_mensagens', {
        p_conversation_id: convId,
        p_aluno_email:     alunoEmail.toLowerCase().trim(),
      });
      if (error) throw error;
      setMensagens((data as TutorMensagem[]) ?? []);
    } catch (err) {
      console.error('Erro ao carregar mensagens:', err);
    }
  }, [alunoEmail]);

  useEffect(() => {
    if (conversationId) {
      carregarMensagens(conversationId);
    } else {
      setMensagens([]);
    }
  }, [conversationId, carregarMensagens]);

  const enviar = async (texto: string): Promise<string | null> => {
    if (!texto.trim() || isLoading) return null;

    // Mensagem otimista do usuário
    const tempId = `temp-${Date.now()}`;
    const msgTemp: TutorMensagem = {
      id:           tempId,
      role:         'user',
      conteudo:     texto.trim(),
      tokens_total: null,
      created_at:   new Date().toISOString(),
    };
    setMensagens(prev => [...prev, msgTemp]);
    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('tutor-chat', {
        body: {
          aluno_email:     alunoEmail,
          conversation_id: conversationId,
          mensagem:        texto.trim(),
          modulo:          'tutor',
          subtab_id:       subtabId ?? null,
        },
      });

      if (error) {
        let mensagemReal: string | null = null;
        try {
          const ctx = (error as { context?: { json?: () => Promise<{ error?: string }> } }).context;
          mensagemReal = (await ctx?.json?.())?.error ?? null;
        } catch { /* ignora */ }
        throw new Error(mensagemReal ?? error.message);
      }

      if (!data?.success) throw new Error(data?.error ?? 'Erro desconhecido');

      const novoConvId: string = data.conversation_id;

      // Notifica conversa nova ao componente pai
      if (!conversationId && novoConvId) {
        onConversationCreated?.(novoConvId);
      }

      // Recarrega mensagens do banco — garante consistência com dados reais
      await carregarMensagens(novoConvId);

      setAcumulador(data.acumulador_tokens ?? 0);

      if (data.creditos_debitados > 0) {
        await refreshCredits();
        window.dispatchEvent(new CustomEvent('jarvis-credits-updated', {
          detail: {
            userEmail:  alunoEmail.toLowerCase().trim(),
            newCredits: data.creditos_restantes,
          },
        }));
      }

      return novoConvId;

    } catch (err: unknown) {
      setMensagens(prev => prev.filter(m => m.id !== tempId));
      const errMsg = err instanceof Error ? err.message : '';

      let title       = 'Erro ao enviar mensagem';
      let description = 'Tente novamente em instantes.';

      if (errMsg.includes('402') || errMsg.includes('insuficientes')) {
        title       = 'Créditos insuficientes';
        description = 'Contate: 85.99216.0605 para adquirir créditos.';
      } else if (errMsg.includes('403') || errMsg.includes('desabilitado')) {
        title       = 'Tutor indisponível';
        description = 'O Tutor Jarvis está temporariamente desabilitado.';
      }

      toast({ title, description, variant: 'destructive' });
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  return { mensagens, isLoading, enviar, creditosRestantes: credits, acumuladorTokens };
};
