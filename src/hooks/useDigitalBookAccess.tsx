import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useStudentAuth } from "./useStudentAuth";

export const useDigitalBookAccess = (materialId?: string) => {
  const { studentData } = useStudentAuth();

  const { data: hasAccess, isLoading } = useQuery({
    queryKey: ['digital-book-access', studentData.email, materialId],
    queryFn: async () => {
      if (!studentData.email || !materialId) return false;

      // Por enquanto, retorna true para todos os alunos
      // Será implementado após a migração da tabela estar disponível
      if (studentData.userType === 'aluno') {
        return true;
      }
      
      return false;
    },
    enabled: !!studentData.email && !!materialId
  });

  return { hasAccess: hasAccess || false, isLoading };
};