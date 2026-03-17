import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useStudentAuth } from "./useStudentAuth";

export interface ExerciseSubmissionDetails {
  id: string;
  data_envio: string | null;
  status_corretor_1: string | null;
  corrigida: boolean;
  nota_total: number | null;
  data_correcao: string | null;
  comentario_admin: string | null;
  redacao_texto: string | null;
  motivo_devolucao: string | null;
}

export const useExerciseSubmission = (exerciseId: string) => {
  const { studentData } = useStudentAuth();

  return useQuery({
    queryKey: ['exercise-submission', exerciseId, studentData.email],
    queryFn: async () => {
      if (!studentData.email) {
        return { hasSubmitted: false, submissionDetails: null as ExerciseSubmissionDetails | null };
      }

      const normalizedEmail = studentData.email.toLowerCase().trim();

      // 1. Verificar em redacoes_exercicio (cobre Produção Guiada e qualquer tipo direto)
      const { data: exercicioSubmission } = await supabase
        .from('redacoes_exercicio')
        .select('id, data_envio, status_corretor_1, corrigida, nota_total, data_correcao, comentario_admin, redacao_texto, motivo_devolucao')
        .eq('exercicio_id', exerciseId)
        .ilike('email_aluno', normalizedEmail)
        .limit(1);

      if (exercicioSubmission && exercicioSubmission.length > 0) {
        return { hasSubmitted: true, submissionData: exercicioSubmission[0], submissionDetails: exercicioSubmission[0] as ExerciseSubmissionDetails };
      }

      // 2. Fallback: verificar em redacoes_enviadas via frase_tematica (Redação com Frase Temática)
      const { data: exerciseData, error: exerciseError } = await supabase
        .from('exercicios')
        .select(`tema_id, temas!inner(frase_tematica)`)
        .eq('id', exerciseId)
        .single();

      if (exerciseError || !exerciseData?.temas?.frase_tematica) {
        return { hasSubmitted: false };
      }

      const fraseTematica = exerciseData.temas.frase_tematica;

      const { data, error } = await supabase
        .from('redacoes_enviadas')
        .select('*')
        .eq('frase_tematica', fraseTematica)
        .ilike('email_aluno', normalizedEmail)
        .is('deleted_at', null)
        .order('data_envio', { ascending: false })
        .limit(1);

      if (error) {
        console.error('Erro ao verificar submissão do exercício:', error);
        return { hasSubmitted: false, submissionDetails: null as ExerciseSubmissionDetails | null };
      }

      const submissionData = data && data.length > 0 ? data[0] : null;
      return { hasSubmitted: !!submissionData, submissionData, submissionDetails: null as ExerciseSubmissionDetails | null };
    },
    enabled: !!studentData.email && !!exerciseId
  });
};