
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "./use-toast";

export const useRedacaoStatus = () => {
  const { toast } = useToast();

  const updateRedacaoStatus = async (
    redacaoId: string, 
    tipoRedacao: 'regular' | 'simulado' | 'exercicio',
    isCorrigida: boolean = true
  ) => {
    try {
      const statusUpdate = {
        corrigida: isCorrigida,
        status: isCorrigida ? 'corrigida' : 'aguardando',
        data_correcao: isCorrigida ? new Date().toISOString() : null
      };

      let result;

      switch (tipoRedacao) {
        case 'regular':
          result = await supabase
            .from('redacoes_enviadas')
            .update(statusUpdate)
            .eq('id', redacaoId);
          break;
        case 'simulado':
          result = await supabase
            .from('redacoes_simulado')
            .update(statusUpdate)
            .eq('id', redacaoId);
          break;
        case 'exercicio':
          result = await supabase
            .from('redacoes_exercicio')
            .update(statusUpdate)
            .eq('id', redacaoId);
          break;
      }

      if (result?.error) {
        throw result.error;
      }

      console.log(`✅ Status da redação ${redacaoId} atualizado para: ${statusUpdate.status}`);
      
      return true;
    } catch (error) {
      console.error('❌ Erro ao atualizar status da redação:', error);
      toast({
        title: "Erro ao atualizar status",
        description: "Não foi possível atualizar o status da redação.",
        variant: "destructive"
      });
      return false;
    }
  };

  return { updateRedacaoStatus };
};
