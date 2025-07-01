
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const useContentAvailability = (turmaCode: string) => {
  // Verifica se há aulas disponíveis
  const { data: hasAulas = false } = useQuery({
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
  const { data: hasExercicios = false } = useQuery({
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
  const { data: hasSimulados = false } = useQuery({
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
  const { data: hasRedacoesTurma = false } = useQuery({
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
  const { data: hasBiblioteca = false } = useQuery({
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
    hasAulas,
    hasExercicios,
    hasSimulados,
    hasRedacoesTurma,
    hasBiblioteca
  };
};
