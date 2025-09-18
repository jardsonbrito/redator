import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface CancelRedacaoOptions {
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

export const useCancelRedacao = (options?: CancelRedacaoOptions) => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const cancelRedacao = async (redacaoId: string, userEmail: string) => {
    setLoading(true);

    try {
      console.log('🔄 Iniciando cancelamento:', { redacaoId, userEmail });

      // 1. Buscar a redação e verificar se pode ser cancelada
      const { data: redacao, error: redacaoError } = await supabase
        .from('redacoes_enviadas')
        .select('*')
        .eq('id', redacaoId)
        .eq('email_aluno', userEmail.toLowerCase().trim())
        .single();

      if (redacaoError || !redacao) {
        throw new Error('Redação não encontrada ou não pertence ao usuário');
      }

      console.log('📄 Redação encontrada:', redacao);

      // 2. Verificar se ainda pode ser cancelada
      if (redacao.corrigida || redacao.nota_total !== null) {
        throw new Error('Não é possível cancelar uma redação que já foi corrigida');
      }

      // Verificar se já iniciou correção
      const temNotasLancadas = redacao.nota_c1 !== null ||
                               redacao.nota_c2 !== null ||
                               redacao.nota_c3 !== null ||
                               redacao.nota_c4 !== null ||
                               redacao.nota_c5 !== null;

      if (temNotasLancadas) {
        throw new Error('Não é possível cancelar uma redação que já iniciou o processo de correção');
      }

      // 3. Determinar quantos créditos devem ser ressarcidos
      let creditosParaRessarcir = 0;
      switch (redacao.tipo_envio) {
        case 'regular':
          creditosParaRessarcir = 1;
          break;
        case 'simulado':
          creditosParaRessarcir = 2;
          break;
        case 'exercicio':
        case 'visitante':
          creditosParaRessarcir = 0;
          break;
        default:
          creditosParaRessarcir = 1;
      }

      console.log('💰 Créditos a ressarcir:', creditosParaRessarcir);

      // 4. Buscar o perfil do usuário
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id, creditos')
        .eq('email', userEmail.toLowerCase().trim())
        .eq('user_type', 'aluno')
        .single();

      if (profileError || !profile) {
        throw new Error('Perfil do usuário não encontrado');
      }

      console.log('👤 Perfil encontrado:', profile);

      // 5. Deletar redação
      const { error: deleteError } = await supabase
        .from('redacoes_enviadas')
        .delete()
        .eq('id', redacaoId);

      if (deleteError) {
        console.error('❌ Erro ao deletar redação:', deleteError);
        throw new Error('Erro ao cancelar redação');
      }

      console.log('🗑️ Redação deletada com sucesso');

      // 6. Ressarcir créditos se necessário
      let novoSaldoCreditos = profile.creditos || 0;
      if (creditosParaRessarcir > 0) {
        novoSaldoCreditos = (profile.creditos || 0) + creditosParaRessarcir;

        const { error: creditError } = await supabase
          .from('profiles')
          .update({ creditos: novoSaldoCreditos })
          .eq('id', profile.id);

        if (creditError) {
          console.error('⚠️ Erro ao ressarcir créditos:', creditError);
          // Redação já foi deletada, mas créditos não foram ressarcidos
          // Em produção seria ideal ter uma transação atômica
        } else {
          console.log('💰 Créditos ressarcidos com sucesso');
        }

        // 7. Registrar no audit de créditos (opcional, pode falhar sem problemas)
        try {
          await supabase
            .from('credit_audit')
            .insert({
              user_id: profile.id,
              admin_id: null,
              action: 'add',
              old_credits: profile.creditos || 0,
              new_credits: novoSaldoCreditos,
              reason: `Ressarcimento por cancelamento de redação ${redacao.tipo_envio}`
            });
          console.log('📝 Audit registrado');
        } catch (auditError) {
          console.warn('⚠️ Erro ao registrar audit (não crítico):', auditError);
        }
      }

      // Sucesso
      let message = 'Redação cancelada com sucesso!';
      if (creditosParaRessarcir > 0) {
        message += ` ${creditosParaRessarcir} crédito(s) foram devolvidos. Novo saldo: ${novoSaldoCreditos}`;
      }

      toast({
        title: "✅ Cancelamento realizado",
        description: message,
        className: "border-green-200 bg-green-50 text-green-900",
        duration: 5000
      });

      options?.onSuccess?.();
      return true;

    } catch (error) {
      console.error('❌ Erro ao cancelar redação:', error);

      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';

      toast({
        title: "Erro no cancelamento",
        description: errorMessage,
        variant: "destructive",
        duration: 5000
      });

      options?.onError?.(errorMessage);
      return false;

    } finally {
      setLoading(false);
    }
  };

  const canCancelRedacao = (redacao: any): boolean => {
    // Debug apenas em desenvolvimento
    if (process.env.NODE_ENV === 'development') {
      console.log('🔍 canCancelRedacao - Verificando redação:', redacao);
      console.log('📋 Campos disponíveis na redação:', Object.keys(redacao));
    }

    // 1. Não pode cancelar se já foi corrigida
    if (redacao.corrigida === true) {
      if (process.env.NODE_ENV === 'development') {
        console.log('❌ Redação já corrigida, não pode cancelar');
      }
      return false;
    }

    // 2. Não pode cancelar se tem nota_total (correção finalizada)
    if (redacao.nota_total !== null && redacao.nota_total !== undefined) {
      if (process.env.NODE_ENV === 'development') {
        console.log('❌ Tem nota total, correção finalizada, não pode cancelar');
      }
      return false;
    }

    // 3. Não pode cancelar se status é "corrigida" ou "devolvida"
    if (redacao.status === 'corrigida' || redacao.status === 'devolvida') {
      if (process.env.NODE_ENV === 'development') {
        console.log('❌ Status não permite cancelamento:', redacao.status);
      }
      return false;
    }

    // 4. Para simulados, verificar se já iniciou qualquer correção
    if (redacao.tipo_envio === 'simulado') {
      // Se já tem qualquer nota individual, significa que um corretor já iniciou
      const temNotasIndividuais = redacao.nota_c1 !== null ||
                                  redacao.nota_c2 !== null ||
                                  redacao.nota_c3 !== null ||
                                  redacao.nota_c4 !== null ||
                                  redacao.nota_c5 !== null;

      if (temNotasIndividuais) {
        if (process.env.NODE_ENV === 'development') {
          console.log('❌ Simulado já tem notas individuais, correção iniciada');
        }
        return false;
      }
    }

    // 5. Verificar se está em correção (status em_andamento)
    if (redacao.status === 'em_andamento') {
      if (process.env.NODE_ENV === 'development') {
        console.log('❌ Redação em andamento, não pode cancelar');
      }
      return false;
    }

    if (process.env.NODE_ENV === 'development') {
      console.log('✅ Permitindo cancelamento - redação não foi corrigida e não iniciou correção');
    }
    return true;
  };

  const getCreditosACancelar = (tipoEnvio: string): number => {
    switch (tipoEnvio) {
      case 'regular':
        return 1;
      case 'simulado':
        return 2;
      case 'exercicio':
        return 0;
      case 'visitante':
        return 0;
      default:
        return 1;
    }
  };

  return {
    cancelRedacao,
    canCancelRedacao,
    getCreditosACancelar,
    loading
  };
};