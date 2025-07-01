
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const useContentAvailability = (turmaCode: string) => {
  const aulasQuery = useQuery({
    queryKey: ['has-aulas', turmaCode],
    queryFn: async () => {
      if (!turmaCode) return false;
      
      try {
        if (turmaCode === "Visitante") {
          const { data } = await supabase
            .from('aulas')
            .select('id')
            .eq('ativo', true)
            .eq('permite_visitante', true)
            .limit(1);
          return Boolean(data && data.length > 0);
        } else {
          const { data } = await supabase
            .from('aulas')
            .select('id')
            .eq('ativo', true)
            .or(`turmas.cs.{${turmaCode}},permite_visitante.eq.true`)
            .limit(1);
          return Boolean(data && data.length > 0);
        }
      } catch (error) {
        console.error('Error checking aulas:', error);
        return false;
      }
    },
    enabled: Boolean(turmaCode),
    staleTime: 5 * 60 * 1000,
  });

  const exerciciosQuery = useQuery({
    queryKey: ['has-exercicios', turmaCode],
    queryFn: async () => {
      if (!turmaCode) return false;
      
      try {
        if (turmaCode === "Visitante") {
          const { data } = await supabase
            .from('exercicios')
            .select('id')
            .eq('ativo', true)
            .eq('permite_visitante', true)
            .limit(1);
          return Boolean(data && data.length > 0);
        } else {
          const { data } = await supabase
            .from('exercicios')
            .select('id')
            .eq('ativo', true)
            .or(`turmas.cs.{${turmaCode}},permite_visitante.eq.true`)
            .limit(1);
          return Boolean(data && data.length > 0);
        }
      } catch (error) {
        console.error('Error checking exercicios:', error);
        return false;
      }
    },
    enabled: Boolean(turmaCode),
    staleTime: 5 * 60 * 1000,
  });

  const simuladosQuery = useQuery({
    queryKey: ['has-simulados', turmaCode],
    queryFn: async () => {
      if (!turmaCode) return false;
      
      try {
        const { data } = await supabase
          .from('simulados')
          .select('id')
          .eq('ativo', true)
          .or(`turmas_autorizadas.cs.{${turmaCode}},permite_visitante.eq.true`)
          .limit(1);
        return Boolean(data && data.length > 0);
      } catch (error) {
        console.error('Error checking simulados:', error);
        return false;
      }
    },
    enabled: Boolean(turmaCode),
    staleTime: 5 * 60 * 1000,
  });

  const redacoesTurmaQuery = useQuery({
    queryKey: ['has-redacoes-turma', turmaCode],
    queryFn: async () => {
      if (!turmaCode || turmaCode === "Visitante") return false;
      
      try {
        const { data } = await supabase
          .rpc('get_redacoes_by_turma', { p_turma: turmaCode });
        return Boolean(data && data.length > 0);
      } catch (error) {
        console.error('Error checking redacoes turma:', error);
        return false;
      }
    },
    enabled: Boolean(turmaCode && turmaCode !== "Visitante"),
    staleTime: 5 * 60 * 1000,
  });

  const bibliotecaQuery = useQuery({
    queryKey: ['has-biblioteca', turmaCode],
    queryFn: async () => {
      if (!turmaCode) return false;
      
      try {
        const { data } = await supabase
          .from('biblioteca_materiais')
          .select('id')
          .eq('status', 'publicado')
          .or(`turmas_autorizadas.cs.{${turmaCode}},permite_visitante.eq.true`)
          .limit(1);
        return Boolean(data && data.length > 0);
      } catch (error) {
        console.error('Error checking biblioteca:', error);
        return false;
      }
    },
    enabled: Boolean(turmaCode),
    staleTime: 5 * 60 * 1000,
  });

  return {
    hasAulas: aulasQuery.data ?? false,
    hasExercicios: exerciciosQuery.data ?? false,
    hasSimulados: simuladosQuery.data ?? false,
    hasRedacoesTurma: redacoesTurmaQuery.data ?? false,
    hasBiblioteca: bibliotecaQuery.data ?? false
  };
};
