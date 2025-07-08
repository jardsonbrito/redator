
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface RedacaoCorretor {
  id: string;
  tipo_redacao: string; // Changed from strict union to string
  nome_aluno: string;
  email_aluno: string;
  frase_tematica: string;
  data_envio: string;
  texto: string;
  status_minha_correcao: 'pendente' | 'incompleta' | 'corrigida';
  eh_corretor_1: boolean;
  eh_corretor_2: boolean;
  redacao_manuscrita_url?: string | null;
  corretor_id_1?: string | null;
  corretor_id_2?: string | null;
}

export const useCorretorRedacoes = (corretorEmail: string) => {
  const [redacoes, setRedacoes] = useState<RedacaoCorretor[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    if (corretorEmail) {
      fetchRedacoes();
    }
  }, [corretorEmail]);

  const fetchRedacoes = async () => {
    try {
      const { data, error } = await supabase
        .rpc('get_redacoes_corretor_detalhadas', {
          corretor_email: corretorEmail
        });

      if (error) throw error;

      // Type cast the data to ensure compatibility
      const redacoesFormatadas = (data || []).map(item => ({
        ...item,
        tipo_redacao: item.tipo_redacao as string,
        status_minha_correcao: item.status_minha_correcao as 'pendente' | 'incompleta' | 'corrigida'
      }));

      console.log('Redações carregadas:', redacoesFormatadas);
      setRedacoes(redacoesFormatadas);
    } catch (error: any) {
      console.error("Erro ao buscar redações do corretor:", error);
      toast({
        title: "Erro ao carregar redações",
        description: "Não foi possível carregar suas redações.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const getRedacoesPorStatus = () => {
    const pendentes = redacoes.filter(r => r.status_minha_correcao === 'pendente');
    const incompletas = redacoes.filter(r => r.status_minha_correcao === 'incompleta');
    const corrigidas = redacoes.filter(r => r.status_minha_correcao === 'corrigida');

    return { pendentes, incompletas, corrigidas };
  };

  // Função para atualizar a lista após correção
  const refreshRedacoes = async () => {
    console.log('Atualizando lista de redações...');
    await fetchRedacoes();
  };

  return {
    redacoes,
    loading,
    fetchRedacoes,
    getRedacoesPorStatus,
    refreshRedacoes
  };
};
