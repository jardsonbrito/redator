import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface TurmaBranding {
  logoUrl: string | null;
  corPrimaria: string | null;
  corSecundaria: string | null;
  corDestaque: string | null;
  nomeTurma: string | null;
}

export function useTurmaBranding(turmaNome: string | null) {
  return useQuery({
    queryKey: ['turma-branding', turmaNome],
    queryFn: async (): Promise<TurmaBranding | null> => {
      if (!turmaNome) return null;

      const { data } = await supabase
        .from('turmas_alunos')
        .select('nome, logo_url, cor_primaria, cor_secundaria, cor_destaque')
        .eq('nome', turmaNome)
        .maybeSingle();

      if (!data) return null;

      // Se nenhuma coluna de branding foi configurada, retorna null (usa padrão)
      const temBranding = data.logo_url || data.cor_primaria || data.cor_secundaria || data.cor_destaque;
      if (!temBranding) return null;

      return {
        nomeTurma: data.nome,
        logoUrl: data.logo_url,
        corPrimaria: data.cor_primaria,
        corSecundaria: data.cor_secundaria,
        corDestaque: data.cor_destaque,
      };
    },
    enabled: !!turmaNome,
    staleTime: 10 * 60 * 1000,
  });
}
