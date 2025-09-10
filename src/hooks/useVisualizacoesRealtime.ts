import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface Visualizacao {
  redacao_id: string;
  email_aluno: string;
  visualizado_em: string;
}

export function useVisualizacoesRealtime() {
  const [visualizacoes, setVisualizacoes] = useState<Map<string, Visualizacao>>(new Map());

  useEffect(() => {
    // Carregar visualizações existentes
    const carregarVisualizacoes = async () => {
      try {
        const { data, error } = await supabase
          .from('redacao_devolucao_visualizacoes')
          .select('redacao_id, email_aluno, visualizado_em');

        if (error) {
          console.error('Erro ao carregar visualizações:', error);
          return;
        }

        if (data) {
          const map = new Map();
          data.forEach(item => {
            const emailNormalizado = item.email_aluno.toLowerCase().trim();
            const key = `${item.redacao_id}-${emailNormalizado}`;
            map.set(key, {
              redacao_id: item.redacao_id,
              email_aluno: emailNormalizado,
              visualizado_em: item.visualizado_em
            });
          });
          setVisualizacoes(map);
          console.log('📋 Carregadas', data.length, 'visualizações:', [...map.keys()]);
        }
      } catch (error) {
        console.error('Erro ao carregar visualizações:', error);
      }
    };

    carregarVisualizacoes();

    // Subscripção para novas visualizações
    const channel = supabase
      .channel('visualizacoes-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'redacao_devolucao_visualizacoes'
        },
        (payload) => {
          console.log('📡 Nova visualização via realtime:', payload.new);
          const emailNormalizado = payload.new.email_aluno.toLowerCase().trim();
          const key = `${payload.new.redacao_id}-${emailNormalizado}`;
          console.log('🔑 Chave da visualização:', key, {
            emailOriginal: payload.new.email_aluno,
            emailNormalizado
          });
          
          setVisualizacoes(prev => {
            const newMap = new Map(prev);
            newMap.set(key, {
              redacao_id: payload.new.redacao_id,
              email_aluno: emailNormalizado,
              visualizado_em: payload.new.visualizado_em
            });
            console.log('📋 Total de visualizações após update:', newMap.size);
            console.log('📋 Todas as chaves após update:', [...newMap.keys()]);
            return newMap;
          });
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, []);

  const isRedacaoVisualizada = (redacaoId: string, emailAluno: string): boolean => {
    // Normalizar email como fazemos no registro
    const emailNormalizado = emailAluno.toLowerCase().trim();
    const chave = `${redacaoId}-${emailNormalizado}`;
    const temVisualizacao = visualizacoes.has(chave);
    
    console.log(`🔍 Verificando visualização para chave "${chave}":`, {
      redacaoId,
      emailOriginal: emailAluno,
      emailNormalizado,
      temVisualizacao,
      totalVisualizacoes: visualizacoes.size,
      todasChaves: [...visualizacoes.keys()]
    });
    
    return temVisualizacao;
  };

  const getVisualizacao = (redacaoId: string, emailAluno: string): Visualizacao | undefined => {
    const emailNormalizado = emailAluno.toLowerCase().trim();
    return visualizacoes.get(`${redacaoId}-${emailNormalizado}`);
  };

  return {
    visualizacoes,
    isRedacaoVisualizada,
    getVisualizacao
  };
}