import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ProfessorSubscriptionData {
  id: string | null;
  plano: string | null;
  plano_exibicao: string | null;
  data_inscricao: string | null;
  data_validade: string | null;
  creditos: number;
  creditos_reais: number;
  status: 'Ativo' | 'Vencido' | 'Sem Assinatura';
  dias_restantes: number;
  observacao: string | null;
}

export const useProfessorSubscription = (professorId: string | undefined) =>
  useQuery<ProfessorSubscriptionData>({
    queryKey: ['professor-subscription', professorId],
    enabled: !!professorId,
    staleTime: 60 * 1000,
    queryFn: async (): Promise<ProfessorSubscriptionData> => {
      // Busca assinatura + saldo real de créditos em paralelo
      const [assinaturaRes, professorRes] = await Promise.all([
        supabase
          .from('professor_assinaturas')
          .select('*')
          .eq('professor_id', professorId!)
          .order('data_validade', { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase
          .from('professores')
          .select('jarvis_correcao_creditos')
          .eq('id', professorId!)
          .maybeSingle(),
      ]);

      if (assinaturaRes.error) throw assinaturaRes.error;

      const creditosReais = professorRes.data?.jarvis_correcao_creditos ?? 0;
      const data = assinaturaRes.data;

      if (!data) {
        return {
          id: null,
          plano: null,
          plano_exibicao: null,
          data_inscricao: null,
          data_validade: null,
          creditos: 0,
          creditos_reais: creditosReais,
          status: 'Sem Assinatura',
          dias_restantes: 0,
          observacao: null,
        };
      }

      // Busca nome de exibição do plano
      let planoExibicao: string | null = null;
      if (data.plano) {
        const { data: planoData } = await supabase
          .from('planos')
          .select('nome_exibicao')
          .eq('nome', data.plano)
          .maybeSingle();
        planoExibicao = planoData?.nome_exibicao ?? data.plano;
      }

      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0);
      const validade = new Date(data.data_validade);
      validade.setHours(0, 0, 0, 0);
      const isAtivo = validade >= hoje;
      const diffMs = validade.getTime() - hoje.getTime();
      const diasRestantes = isAtivo ? Math.ceil(diffMs / (1000 * 60 * 60 * 24)) : 0;

      return {
        id: data.id,
        plano: data.plano,
        plano_exibicao: planoExibicao,
        data_inscricao: data.data_inscricao,
        data_validade: data.data_validade,
        creditos: data.creditos ?? 0,
        creditos_reais: creditosReais,
        status: isAtivo ? 'Ativo' : 'Vencido',
        dias_restantes: diasRestantes,
        observacao: data.observacao ?? null,
      };
    },
  });
