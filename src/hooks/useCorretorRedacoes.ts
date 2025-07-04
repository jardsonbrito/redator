
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface RedacaoCorretor {
  id: string;
  tipo_redacao: string;
  nome_aluno: string;
  email_aluno: string;
  frase_tematica: string;
  data_envio: string;
  texto: string;
  status_minha_correcao: string;
  eh_corretor_1: boolean;
  eh_corretor_2: boolean;
}

export const useCorretorRedacoes = (corretorEmail: string) => {
  const [redacoes, setRedacoes] = useState<RedacaoCorretor[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchRedacoes = async () => {
    if (!corretorEmail) return;

    try {
      const { data, error } = await supabase
        .rpc('get_redacoes_corretor_detalhadas', {
          corretor_email: corretorEmail
        });

      if (error) throw error;

      setRedacoes(data || []);
    } catch (error: any) {
      console.error("Erro ao buscar redações:", error);
      toast({
        title: "Erro ao carregar redações",
        description: error.message || "Ocorreu um erro inesperado.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRedacoes();
  }, [corretorEmail]);

  const getRedacoesPorStatus = () => {
    const pendentes = redacoes.filter(r => r.status_minha_correcao === 'pendente');
    const incompletas = redacoes.filter(r => r.status_minha_correcao === 'incompleta');
    const corrigidas = redacoes.filter(r => r.status_minha_correcao === 'corrigida');

    return { pendentes, incompletas, corrigidas };
  };

  return {
    redacoes,
    loading,
    fetchRedacoes,
    getRedacoesPorStatus,
  };
};
