
import { useQuery } from "@tanstack/react-query";
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
  redacao_imagem_gerada_url?: string | null; // Imagem A4 gerada de redação digitada
  contagem_palavras?: number | null; // Número de palavras (redações digitadas)
  corretor_id_1?: string | null;
  corretor_id_2?: string | null;
  turma?: string; // Added turma property
  // Campos de congelamento
  corrigida?: boolean;
  congelada?: boolean;
  data_descongelamento?: string | null;
}

export const useCorretorRedacoes = (corretorEmail: string) => {
  const { toast } = useToast();

  const { data: redacoes = [], isLoading: loading, error, refetch } = useQuery({
    queryKey: ['corretor-redacoes', corretorEmail],
    queryFn: async () => {
      const { data, error } = await supabase
        .rpc('get_redacoes_corretor_detalhadas', {
          corretor_email: corretorEmail
        });

      if (error) throw error;

      // Type cast the data to ensure compatibility
      const redacoesFormatadas = (data || []).map(item => ({
        ...item,
        tipo_redacao: item.tipo_redacao as string,
        status_minha_correcao: item.status_minha_correcao as 'pendente' | 'em_correcao' | 'incompleta' | 'corrigida' | 'devolvida'
      }));

      return redacoesFormatadas;
    },
    enabled: !!corretorEmail,
    staleTime: 1000 * 60, // 1 minuto - considera dados "frescos" por 1 minuto
    refetchInterval: 1000 * 60 * 2, // Refetch automático a cada 2 minutos
    refetchOnWindowFocus: true, // Refetch quando o usuário volta para a aba
  });

  // Mostrar erro se houver
  if (error) {
    toast({
      title: "Erro ao carregar redações",
      description: "Não foi possível carregar suas redações.",
      variant: "destructive"
    });
  }

  const getRedacoesPorStatus = () => {
    const pendentes = redacoes.filter(r => r.status_minha_correcao === 'pendente');
    const emCorrecao = redacoes.filter(r => r.status_minha_correcao === 'em_correcao');
    const incompletas = redacoes.filter(r => r.status_minha_correcao === 'incompleta');
    const corrigidas = redacoes.filter(r => r.status_minha_correcao === 'corrigida');

    return { pendentes, emCorrecao, incompletas, corrigidas };
  };

  // Função para atualizar a lista após correção
  const refreshRedacoes = async () => {
    await refetch();
  };

  return {
    redacoes,
    loading,
    fetchRedacoes: refetch, // Compatibilidade com código antigo
    getRedacoesPorStatus,
    refreshRedacoes
  };
};
