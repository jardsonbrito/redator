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

      // Normalizar email para busca (remover espaços e converter para lowercase)
      const normalizedEmail = studentData.email.toLowerCase().trim();

      const { data, error } = await supabase
        .from('redacoes_simulado')
        .select('id, data_envio')
        .eq('id_simulado', simuladoId)
        .ilike('email_aluno', normalizedEmail)
        .order('data_envio', { ascending: false })
        .limit(1);

      if (error) {
        console.error('Erro ao verificar submissão do simulado:', error);
        return { hasSubmitted: false };
      }

      // Extrair o primeiro item se houver dados
      const submissionData = data && data.length > 0 ? data[0] : null;

      return {
        hasSubmitted: !!submissionData,
        submissionData: submissionData
      };
    },
    enabled: !!studentData.email && !!simuladoId
  });
};