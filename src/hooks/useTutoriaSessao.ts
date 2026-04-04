import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface TutoriaSessao {
  id: string;
  etapa_atual: 'preenchimento' | 'sugestoes' | 'validacao' | 'gerado';
  dados_preenchidos: Record<string, string>;
  dados_sugeridos: Record<string, string>;
  validacao_resultado: any;
  texto_gerado: string | null;
  engenharia_paragrafo: any;
  finalizado: boolean;
  creditos_consumidos: number;
  criado_em: string;
  atualizado_em: string;
}

export const useTutoriaSessao = (
  userEmail: string,
  modoId: string | null,
  subtabNome: string | null
) => {
  const [sessao, setSessao] = useState<TutoriaSessao | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const loadSessao = useCallback(async () => {
    if (!userEmail || !modoId || !subtabNome) {
      setSessao(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { data, error: rpcError } = await supabase
        .rpc('get_or_create_tutoria_sessao', {
          p_email: userEmail,
          p_modo_id: modoId,
          p_subtab_nome: subtabNome
        });

      if (rpcError) {
        console.error('Erro ao buscar sessão:', rpcError);
        setError(rpcError.message);
        setSessao(null);
        return;
      }

      if (data && data.length > 0) {
        setSessao(data[0] as TutoriaSessao);
      } else {
        setSessao(null);
      }
    } catch (err) {
      console.error('Erro ao buscar sessão:', err);
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
      setSessao(null);
    } finally {
      setLoading(false);
    }
  }, [userEmail, modoId, subtabNome]);

  useEffect(() => {
    loadSessao();
  }, [loadSessao]);

  const updateSessao = useCallback(async (updates: Partial<TutoriaSessao>) => {
    if (!sessao) return false;

    try {
      const { data, error: updateError } = await supabase
        .rpc('update_tutoria_sessao', {
          p_sessao_id: sessao.id,
          p_etapa_atual: updates.etapa_atual || null,
          p_dados_preenchidos: updates.dados_preenchidos || null,
          p_dados_sugeridos: updates.dados_sugeridos || null,
          p_validacao_resultado: updates.validacao_resultado || null,
          p_texto_gerado: updates.texto_gerado || null,
          p_engenharia_paragrafo: updates.engenharia_paragrafo || null,
          p_finalizado: updates.finalizado !== undefined ? updates.finalizado : null,
          p_creditos_consumidos: updates.creditos_consumidos || null
        });

      if (updateError) {
        console.error('Erro ao atualizar sessão:', updateError);
        toast({
          title: "Erro ao salvar progresso",
          description: updateError.message,
          variant: "destructive"
        });
        return false;
      }

      // Recarregar sessão atualizada
      await loadSessao();
      return true;
    } catch (err) {
      console.error('Erro ao atualizar sessão:', err);
      toast({
        title: "Erro ao salvar progresso",
        description: err instanceof Error ? err.message : 'Erro desconhecido',
        variant: "destructive"
      });
      return false;
    }
  }, [sessao, loadSessao, toast]);

  const resetSessao = useCallback(async () => {
    if (!sessao) return false;

    try {
      const { error: resetError } = await supabase
        .rpc('reset_tutoria_sessao', { p_sessao_id: sessao.id });

      if (resetError) {
        console.error('Erro ao resetar sessão:', resetError);
        toast({
          title: "Erro ao resetar",
          description: resetError.message,
          variant: "destructive"
        });
        return false;
      }

      // Recarregar sessão resetada
      await loadSessao();
      return true;
    } catch (err) {
      console.error('Erro ao resetar sessão:', err);
      toast({
        title: "Erro ao resetar",
        description: err instanceof Error ? err.message : 'Erro desconhecido',
        variant: "destructive"
      });
      return false;
    }
  }, [sessao, loadSessao, toast]);

  const chamarSugestoes = useCallback(async (
    dadosPreenchidos: Record<string, string>,
    camposVazios: string[]
  ) => {
    if (!sessao || !userEmail) return null;

    try {
      const { data, error } = await supabase.functions.invoke('jarvis-tutoria-sugestoes', {
        body: {
          userEmail,
          sessaoId: sessao.id,
          dadosPreenchidos,
          camposVazios
        }
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error || 'Erro ao gerar sugestões');

      return data.sugestoes as Record<string, string>;
    } catch (err) {
      console.error('Erro ao chamar sugestões:', err);
      toast({
        title: "Erro ao gerar sugestões",
        description: err instanceof Error ? err.message : 'Erro desconhecido',
        variant: "destructive"
      });
      return null;
    }
  }, [sessao, userEmail, toast]);

  const chamarValidacao = useCallback(async (dadosCompletos: Record<string, string>) => {
    if (!sessao || !userEmail) return null;

    try {
      const { data, error } = await supabase.functions.invoke('jarvis-tutoria-validar', {
        body: {
          userEmail,
          sessaoId: sessao.id,
          dadosCompletos
        }
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error || 'Erro ao validar');

      return data.validacao;
    } catch (err) {
      console.error('Erro ao chamar validação:', err);
      toast({
        title: "Erro ao validar",
        description: err instanceof Error ? err.message : 'Erro desconhecido',
        variant: "destructive"
      });
      return null;
    }
  }, [sessao, userEmail, toast]);

  const chamarGeracao = useCallback(async (
    dadosCompletos: Record<string, string>,
    creditosNecessarios: number
  ) => {
    if (!sessao || !userEmail) return null;

    try {
      const { data, error } = await supabase.functions.invoke('jarvis-tutoria-gerar', {
        body: {
          userEmail,
          sessaoId: sessao.id,
          dadosCompletos,
          creditosNecessarios
        }
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error || 'Erro ao gerar texto');

      // Atualizar estado local com o texto gerado
      setSessao(prev => prev ? {
        ...prev,
        texto_gerado: data.texto_gerado,
        etapa_atual: 'gerado',
        finalizado: true,
        creditos_consumidos: data.creditos_consumidos
      } : null);

      return {
        texto_gerado: data.texto_gerado,
        palavras_geradas: data.palavras_geradas,
        jarvis_creditos_restantes: data.jarvis_creditos_restantes,
        creditos_consumidos: data.creditos_consumidos
      };
    } catch (err) {
      console.error('Erro ao chamar geração:', err);
      toast({
        title: "Erro ao gerar texto",
        description: err instanceof Error ? err.message : 'Erro desconhecido',
        variant: "destructive"
      });
      return null;
    }
  }, [sessao, userEmail, toast]);

  return {
    sessao,
    loading,
    error,
    updateSessao,
    resetSessao,
    chamarSugestoes,
    chamarValidacao,
    chamarGeracao,
    refreshSessao: loadSessao
  };
};
