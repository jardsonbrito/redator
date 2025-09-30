import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useStudentAuth } from "./useStudentAuth";

export const useExerciseSubmission = (exerciseId: string) => {
  const { studentData } = useStudentAuth();

  return useQuery({
    queryKey: ['exercise-submission', exerciseId, studentData.email],
    queryFn: async () => {
      if (!studentData.email) {
        return { hasSubmitted: false };
      }

      // Normalizar email para busca (remover espaços e converter para lowercase)
      const normalizedEmail = studentData.email.toLowerCase().trim();

      // Primeiro, buscar a frase_tematica do exercício
      const { data: exerciseData, error: exerciseError } = await supabase
        .from('exercicios')
        .select(`
          tema_id,
          temas!inner(frase_tematica)
        `)
        .eq('id', exerciseId)
        .single();

      if (exerciseError || !exerciseData?.temas?.frase_tematica) {
        console.error('Erro ao buscar dados do exercício:', exerciseError);
        return { hasSubmitted: false };
      }

      const fraseTematica = exerciseData.temas.frase_tematica;

      // Buscar se existe redação para esta frase temática e email
      const { data, error } = await supabase
        .from('redacoes_enviadas')
        .select('*')
        .eq('frase_tematica', fraseTematica)
        .ilike('email_aluno', normalizedEmail)
        .order('data_envio', { ascending: false })
        .limit(1);

      if (error) {
        console.error('Erro ao verificar submissão do exercício:', error);
        return { hasSubmitted: false };
      }

      // Extrair o primeiro item se houver dados
      const submissionData = data && data.length > 0 ? data[0] : null;

      const result = {
        hasSubmitted: !!submissionData,
        submissionData: submissionData
      };

      return result;
    },
    enabled: !!studentData.email && !!exerciseId
  });
};