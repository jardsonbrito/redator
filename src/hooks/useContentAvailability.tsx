
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

// Simple async functions with explicit return types
async function checkAulas(turmaCode: string): Promise<boolean> {
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
}

async function checkExercicios(turmaCode: string): Promise<boolean> {
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
}

async function checkSimulados(turmaCode: string): Promise<boolean> {
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
}

async function checkRedacoesTurma(turmaCode: string): Promise<boolean> {
  if (!turmaCode || turmaCode === "Visitante") return false;
  
  try {
    const { data } = await supabase
      .rpc('get_redacoes_by_turma', { p_turma: turmaCode });
    return Boolean(data && data.length > 0);
  } catch (error) {
    console.error('Error checking redacoes turma:', error);
    return false;
  }
}

async function checkBiblioteca(turmaCode: string): Promise<boolean> {
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
}

interface ContentAvailability {
  hasAulas: boolean;
  hasExercicios: boolean;
  hasSimulados: boolean;
  hasRedacoesTurma: boolean;
  hasBiblioteca: boolean;
}

export const useContentAvailability = (turmaCode: string): ContentAvailability => {
  const aulasQuery = useQuery({
    queryKey: ['has-aulas', turmaCode],
    queryFn: () => checkAulas(turmaCode),
    enabled: Boolean(turmaCode),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const exerciciosQuery = useQuery({
    queryKey: ['has-exercicios', turmaCode],
    queryFn: () => checkExercicios(turmaCode),
    enabled: Boolean(turmaCode),
    staleTime: 5 * 60 * 1000,
  });

  const simuladosQuery = useQuery({
    queryKey: ['has-simulados', turmaCode],
    queryFn: () => checkSimulados(turmaCode),
    enabled: Boolean(turmaCode),
    staleTime: 5 * 60 * 1000,
  });

  const redacoesTurmaQuery = useQuery({
    queryKey: ['has-redacoes-turma', turmaCode],
    queryFn: () => checkRedacoesTurma(turmaCode),
    enabled: Boolean(turmaCode && turmaCode !== "Visitante"),
    staleTime: 5 * 60 * 1000,
  });

  const bibliotecaQuery = useQuery({
    queryKey: ['has-biblioteca', turmaCode],
    queryFn: () => checkBiblioteca(turmaCode),
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
