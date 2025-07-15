import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export const useAlunosPendentes = () => {
  const [temAlunosPendentes, setTemAlunosPendentes] = useState(false);
  const [loading, setLoading] = useState(true);

  const verificarAlunosPendentes = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.rpc('get_alunos_pendentes');
      
      if (error) {
        console.error('Erro ao verificar alunos pendentes:', error);
        return;
      }

      setTemAlunosPendentes((data || []).length > 0);
    } catch (error) {
      console.error('Erro ao verificar alunos pendentes:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    verificarAlunosPendentes();
    
    // Verificar a cada 30 segundos se há novos alunos pendentes
    const interval = setInterval(verificarAlunosPendentes, 30000);
    
    return () => clearInterval(interval);
  }, []);

  const resetarVerificacao = () => {
    setTemAlunosPendentes(false);
  };

  return {
    temAlunosPendentes,
    loading,
    verificarAlunosPendentes,
    resetarVerificacao
  };
};