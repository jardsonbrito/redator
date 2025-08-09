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
            map.set(`${item.redacao_id}-${item.email_aluno}`, {
              redacao_id: item.redacao_id,
              email_aluno: item.email_aluno,
              visualizado_em: item.visualizado_em
            });
          });
          setVisualizacoes(map);
          console.log('📋 Carregadas', data.length, 'visualizações');
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
          
          setVisualizacoes(prev => new Map(prev).set(
            `${payload.new.redacao_id}-${payload.new.email_aluno}`,
            {
              redacao_id: payload.new.redacao_id,
              email_aluno: payload.new.email_aluno,
              visualizado_em: payload.new.visualizado_em
            }
          ));
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, []);

  const isRedacaoVisualizada = (redacaoId: string, emailAluno: string): boolean => {
    return visualizacoes.has(`${redacaoId}-${emailAluno}`);
  };

  const getVisualizacao = (redacaoId: string, emailAluno: string): Visualizacao | undefined => {
    return visualizacoes.get(`${redacaoId}-${emailAluno}`);
  };

  return {
    visualizacoes,
    isRedacaoVisualizada,
    getVisualizacao
  };
}