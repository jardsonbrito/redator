import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useStudentAuth } from "./useStudentAuth";

export const useSimuladoSubmission = (simuladoId: string) => {
  const { studentData } = useStudentAuth();
  
  return useQuery({
    queryKey: ['simulado-submission', simuladoId, studentData.email],
    queryFn: async () => {
      if (!studentData.email) {
        return { hasSubmitted: false };
      }

      const { data, error } = await supabase
        .from('redacoes_simulado')
        .select('id, data_envio')
        .eq('id_simulado', simuladoId)
        .eq('email_aluno', studentData.email)
        .maybeSingle();

      if (error) {
        console.error('Erro ao verificar submissão do simulado:', error);
        return { hasSubmitted: false };
      }

      return {
        hasSubmitted: !!data,
        submissionData: data
      };
    },
    enabled: !!studentData.email && !!simuladoId
  });
};