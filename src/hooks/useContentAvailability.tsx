
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const useContentAvailability = (turmaCode: string) => {
  const checkAulas = async (): Promise<boolean> => {
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
  };

  const checkExercicios = async (): Promise<boolean> => {
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
  };

  const checkSimulados = async (): Promise<boolean> => {
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
  };

  const checkRedacoesTurma = async (): Promise<boolean> => {
    if (!turmaCode || turmaCode === "Visitante") return false;
    
    try {
      const { data } = await supabase
        .rpc('get_redacoes_by_turma', { p_turma: turmaCode });
      return Boolean(data && data.length > 0);
    } catch (error) {
      console.error('Error checking redacoes turma:', error);
      return false;
    }
  };

  const checkBiblioteca = async (): Promise<boolean> => {
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
  };

  const aulasQuery = useQuery({
    queryKey: ['has-aulas', turmaCode],
    queryFn: checkAulas,
    enabled: Boolean(turmaCode)
  });

  const exerciciosQuery = useQuery({
    queryKey: ['has-exercicios', turmaCode],
    queryFn: checkExercicios,
    enabled: Boolean(turmaCode)
  });

  const simuladosQuery = useQuery({
    queryKey: ['has-simulados', turmaCode],
    queryFn: checkSimulados,
    enabled: Boolean(turmaCode)
  });

  const redacoesTurmaQuery = useQuery({
    queryKey: ['has-redacoes-turma', turmaCode],
    queryFn: checkRedacoesTurma,
    enabled: Boolean(turmaCode && turmaCode !== "Visitante")
  });

  const bibliotecaQuery = useQuery({
    queryKey: ['has-biblioteca', turmaCode],
    queryFn: checkBiblioteca,
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
