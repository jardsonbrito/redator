
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
  status_minha_correcao: 'pendente' | 'em_correcao' | 'incompleta' | 'corrigida' | 'devolvida';
  eh_corretor_1: boolean;
  eh_corretor_2: boolean;
  redacao_manuscrita_url?: string | null;
  corretor_id_1?: string | null;
  corretor_id_2?: string | null;
  turma?: string; // Added turma property
  render_status?: string; // Added for digitada essay rendering
  render_image_url?: string; // Added for digitada essay rendering
  thumb_url?: string; // Added for thumbnails
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
      console.log('🔍 Carregando redações para corretor:', corretorEmail);
      
      const { data, error } = await supabase
        .rpc('get_redacoes_corretor', {
          corretor_email: corretorEmail
        });

      if (error) throw error;

      console.log('📋 Raw data from RPC:', data);

      // Type cast and transform the data to ensure compatibility
      const redacoesFormatadas = (data || []).map(item => {
        // Determine status based on corrigida flag and other factors
        let status_minha_correcao: 'pendente' | 'em_correcao' | 'incompleta' | 'corrigida' = 'pendente';
        if (item.corrigida) {
          status_minha_correcao = 'corrigida';
        }

        return {
          ...item,
          tipo_redacao: item.tipo_redacao as string,
          status_minha_correcao,
          eh_corretor_1: true, // Default since this corretor is viewing it
          eh_corretor_2: false, // Default
          redacao_texto: item.texto, // Map texto to redacao_texto for consistency
        };
      });

      console.log('🎯 Redações formatadas:', redacoesFormatadas);
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
    const emCorrecao = redacoes.filter(r => r.status_minha_correcao === 'em_correcao');
    const incompletas = redacoes.filter(r => r.status_minha_correcao === 'incompleta');
    const corrigidas = redacoes.filter(r => r.status_minha_correcao === 'corrigida');

    return { pendentes, emCorrecao, incompletas, corrigidas };
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
