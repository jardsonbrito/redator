
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const useContentAvailability = (turmaCode: string) => {
  // Verifica se há aulas disponíveis
  const aulasQuery = useQuery<boolean>({
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
    enabled: Boolean(turmaCode)
  });

  // Verifica se há exercícios disponíveis
  const exerciciosQuery = useQuery<boolean>({
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
    enabled: Boolean(turmaCode)
  });

  // Verifica se há simulados disponíveis
  const simuladosQuery = useQuery<boolean>({
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
    enabled: Boolean(turmaCode)
  });

  // Verifica se há redações da turma
  const redacoesTurmaQuery = useQuery<boolean>({
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
    enabled: Boolean(turmaCode && turmaCode !== "Visitante")
  });

  // Verifica se há materiais da biblioteca disponíveis
  const bibliotecaQuery = useQuery<boolean>({
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
    enabled: Boolean(turmaCode)
  });

  return {
    hasAulas: aulasQuery.data ?? false,
    hasExercicios: exerciciosQuery.data ?? false,
    hasSimulados: simuladosQuery.data ?? false,
    hasRedacoesTurma: redacoesTurmaQuery.data ?? false,
    hasBiblioteca: bibliotecaQuery.data ?? false
  };
};
