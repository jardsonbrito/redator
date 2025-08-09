import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface RegistroVisualizacao {
  redacao_id: string;
  tabela_origem: string;
  email_aluno: string;
}

export function useVisualizacaoRedacao() {
  const [isRegistrando, setIsRegistrando] = useState(false);
  const { toast } = useToast();

  const registrarVisualizacao = async (dados: RegistroVisualizacao) => {
    setIsRegistrando(true);
    
    try {
      console.log('🔄 Registrando visualização:', dados);
      
      // Verificar se já existe registro (evitar duplicatas)
      const { data: existente } = await supabase
        .from('redacao_devolucao_visualizacoes')
        .select('id')
        .eq('redacao_id', dados.redacao_id)
        .eq('email_aluno', dados.email_aluno)
        .maybeSingle();

      if (existente) {
        console.log('⚠️ Já existe registro de visualização');
        toast({
          title: "Já visualizada",
          description: "Você já marcou esta redação como visualizada",
        });
        return { success: true, isNew: false };
      }

      // Usar a RPC function existente
      const { data, error } = await supabase.rpc('marcar_redacao_devolvida_como_visualizada', {
        redacao_id_param: dados.redacao_id,
        tabela_origem_param: dados.tabela_origem,
        email_aluno_param: dados.email_aluno.toLowerCase().trim()
      });

      if (error) {
        console.error('❌ Erro ao registrar visualização:', error);
        toast({
          title: "Erro ao registrar",
          description: "Não foi possível marcar como visualizada. Tente novamente.",
          variant: "destructive"
        });
        return { success: false, error };
      }

      console.log('✅ Visualização registrada com sucesso');
      toast({
        title: "Marcado como ciente",
        description: "Redação marcada como visualizada com sucesso",
      });
      
      return { success: true, isNew: true, data };

    } catch (error) {
      console.error('💥 Erro inesperado:', error);
      toast({
        title: "Erro inesperado",
        description: "Ocorreu um erro inesperado. Tente novamente.",
        variant: "destructive"
      });
      return { success: false, error };
    } finally {
      setIsRegistrando(false);
    }
  };

  return {
    registrarVisualizacao,
    isRegistrando
  };
}