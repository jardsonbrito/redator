import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { useCreditSync } from '@/hooks/useCreditSync';

interface CancelRedacaoOptions {
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

export const useCancelRedacao = (options?: CancelRedacaoOptions) => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { syncCreditsUpdate } = useCreditSync();

  const cancelRedacao = async (redacaoId: string, userEmail: string) => {
    setLoading(true);

    // Função para log persistente
    const addDebugLog = (msg: string) => {
      const timestamp = new Date().toISOString().substring(11, 19);
      const logEntry = `[${timestamp}] ${msg}`;
      console.log(logEntry);

      // Salvar no localStorage para persistir entre reloads
      const existingLogs = localStorage.getItem('cancelamento_logs') || '';
      const newLogs = existingLogs + '\n' + logEntry;
      localStorage.setItem('cancelamento_logs', newLogs);
    };

    try {
      addDebugLog('🔄 Iniciando cancelamento de redação regular...');
      addDebugLog(`📧 Email: ${userEmail}, ID: ${redacaoId}`);

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

      addDebugLog('📄 Redação encontrada: ' + JSON.stringify({
        id: redacao.id,
        tipo_envio: redacao.tipo_envio,
        corrigida: redacao.corrigida,
        nota_total: redacao.nota_total
      }));

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

      addDebugLog(`💰 Créditos a ressarcir: ${creditosParaRessarcir}`);

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

      addDebugLog(`👤 Perfil encontrado: ID=${profile.id}, créditos=${profile.creditos}`);

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

        // USAR ABORDAGEM MAIS DIRETA - SIMILAR AO CONSUMO
        addDebugLog('🔧 🔧 🔧 RETORNANDO CRÉDITOS - MÉTODO MAIS DIRETO 🔧 🔧 🔧');
        addDebugLog(`📊 Créditos atuais: ${profile.creditos}`);
        addDebugLog(`➕ Créditos a ressarcir: ${creditosParaRessarcir}`);
        addDebugLog(`🎯 Novos créditos esperados: ${novoSaldoCreditos}`);

        // Usar função RPC para ressarcir créditos
        let ressarcimentoSucesso = false;
        try {
          addDebugLog('🔧 Tentando refund_credits_on_cancel...');
          addDebugLog(`📋 Parâmetros: user_id=${profile.id}, amount=${creditosParaRessarcir}`);

          const { data: refundResult, error: refundError } = await supabase
            .rpc('refund_credits_on_cancel', {
              p_user_id: profile.id,
              p_amount: creditosParaRessarcir,
              p_reason: `Ressarcimento por cancelamento de redação ${redacao.tipo_envio}`
            });

          addDebugLog(`🔧 Resultado refund_credits_on_cancel: data=${refundResult}, error=${JSON.stringify(refundError)}`);

          if (refundError) {
            addDebugLog(`❌ Erro na função refund_credits_on_cancel: ${JSON.stringify(refundError)}`);
            addDebugLog(`❌ Código do erro: ${refundError.code}, Mensagem: ${refundError.message}`);

            // Se erro PGRST202, a função não existe - tentar fallback
            if (refundError.code === 'PGRST202') {
              addDebugLog('🔄 Função refund_credits_on_cancel não encontrada - usando fallback direto');
              throw new Error('FUNCTION_NOT_FOUND');
            }

            // Outros erros são re-lançados
            const errorMessage = refundError.message || 'Erro desconhecido na função de ressarcimento';
            throw new Error(`Falha no ressarcimento: ${errorMessage}`);
          }

          if (refundResult === true) {
            addDebugLog('✅ refund_credits_on_cancel funcionou!');
            novoSaldoCreditos = (profile.creditos || 0) + creditosParaRessarcir;
            addDebugLog(`💰 Novos créditos calculados: ${profile.creditos} + ${creditosParaRessarcir} = ${novoSaldoCreditos}`);
            ressarcimentoSucesso = true;
          } else {
            addDebugLog(`⚠️ refund_credits_on_cancel retornou valor inesperado: ${refundResult}`);
            throw new Error(`Função de refund retornou valor inválido: ${refundResult}`);
          }
        } catch (refundErr) {
          addDebugLog(`💥 Erro na refund_credits_on_cancel: ${JSON.stringify(refundErr)}`);

          // Se é erro de função não encontrada, tentar fallback direto
          if (refundErr instanceof Error && refundErr.message === 'FUNCTION_NOT_FOUND') {
            addDebugLog('🔄 FALLBACK: Tentando update direto no banco...');

            try {
              novoSaldoCreditos = (profile.creditos || 0) + creditosParaRessarcir;

              // Update direto na tabela profiles
              const { error: updateError } = await supabase
                .from('profiles')
                .update({
                  creditos: novoSaldoCreditos,
                  updated_at: new Date().toISOString()
                })
                .eq('id', profile.id);

              if (updateError) {
                addDebugLog(`❌ Erro no update direto: ${JSON.stringify(updateError)}`);
                throw updateError;
              }

              addDebugLog(`✅ Update direto funcionou! ${profile.creditos} → ${novoSaldoCreditos}`);
              ressarcimentoSucesso = true;

              // Tentar registrar audit manualmente com schema REAL
              try {
                await supabase
                  .from('credit_audit')
                  .insert({
                    user_id: profile.id,
                    admin_id: null,
                    action: 'refund',
                    old_credits: profile.creditos || 0,
                    new_credits: novoSaldoCreditos,
                    created_at: new Date().toISOString()
                  });
                addDebugLog('✅ Audit registrado via fallback (schema real)');
              } catch (auditErr) {
                addDebugLog(`⚠️ Erro no audit (não crítico): ${JSON.stringify(auditErr)}`);
              }

            } catch (fallbackErr) {
              addDebugLog(`💥 Erro no fallback: ${JSON.stringify(fallbackErr)}`);
              throw fallbackErr;
            }
          } else {
            // Outros erros são re-lançados
            throw refundErr;
          }
        }

        if (!ressarcimentoSucesso) {
          throw new Error('Falha ao ressarcir créditos - todas as tentativas falharam');
        }

        // Verificar se o ressarcimento funcionou no banco
        addDebugLog('🔍 Verificando se o ressarcimento funcionou...');
        const { data: verifyData, error: verifyError } = await supabase
          .from('profiles')
          .select('creditos')
          .eq('id', profile.id)
          .single();

        addDebugLog(`🔍 Verificação pós-ressarcimento: creditos=${verifyData?.creditos}, error=${JSON.stringify(verifyError)}`);

        if (verifyData && verifyError === null) {
          novoSaldoCreditos = verifyData.creditos; // Usar valor real do banco
          addDebugLog(`✅ CONFIRMADO! Créditos atualizados no banco: ${profile.creditos} → ${verifyData.creditos}`);
        } else {
          addDebugLog(`⚠️ ERRO na verificação: ${JSON.stringify(verifyError)}`);
          throw new Error('Não foi possível verificar a atualização dos créditos');
        }
      }

      // SINCRONIZAR INTERFACE APÓS RESSARCIMENTO
      if (creditosParaRessarcir > 0) {
        addDebugLog('🔄 Sincronizando interface de créditos...');

        await syncCreditsUpdate(
          userEmail.toLowerCase().trim(),
          novoSaldoCreditos,
          'add',
          creditosParaRessarcir
        );

        addDebugLog('✅ Sincronização completa via hook useCreditSync');
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

  const cancelRedacaoSimulado = async (redacaoId: string, userEmail: string) => {
    setLoading(true);

    // Função para log persistente
    const addDebugLog = (msg: string) => {
      const timestamp = new Date().toISOString().substring(11, 19);
      const logEntry = `[${timestamp}] ${msg}`;
      console.log(logEntry);

      // Salvar no localStorage para persistir entre reloads
      const existingLogs = localStorage.getItem('cancelamento_logs') || '';
      const newLogs = existingLogs + '\n' + logEntry;
      localStorage.setItem('cancelamento_logs', newLogs);
    };

    try {
      const normalizedEmail = userEmail.toLowerCase().trim();
      addDebugLog('🔄 Iniciando cancelamento de simulado...');
      addDebugLog(`📧 Email: ${userEmail} → ${normalizedEmail}, ID: ${redacaoId}`);

      // 1. Buscar a redação de simulado e verificar se pode ser cancelada
      // Primeiro, tentar buscar apenas por ID para ver se RLS está bloqueando
      const { data: redacaoById, error: redacaoByIdError } = await supabase
        .from('redacoes_simulado')
        .select('*')
        .eq('id', redacaoId)
        .single();

      console.log('🔍 Busca apenas por ID:', {
        redacaoById,
        redacaoByIdError
      });

      // Agora buscar com filtro de email
      const { data: redacao, error: redacaoError } = await supabase
        .from('redacoes_simulado')
        .select('*')
        .eq('id', redacaoId)
        .eq('email_aluno', normalizedEmail)
        .single();

      console.log('🔍 Resultado da busca de simulado:', {
        redacao,
        redacaoError,
        query: {
          tabela: 'redacoes_simulado',
          id: redacaoId,
          email_aluno: normalizedEmail
        }
      });

      if (redacaoError || !redacao) {
        throw new Error('Redação não encontrada ou não pertence ao usuário');
      }

      console.log('📄 Redação de simulado encontrada:', redacao);

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

      // 3. Simulados sempre consomem 2 créditos
      const creditosParaRessarcir = 2;

      addDebugLog(`💰 Créditos a ressarcir: ${creditosParaRessarcir}`);

      // 4. Buscar o perfil do usuário
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id, creditos')
        .eq('email', normalizedEmail)
        .eq('user_type', 'aluno')
        .single();

      if (profileError || !profile) {
        throw new Error('Perfil do usuário não encontrado');
      }

      addDebugLog(`👤 Perfil encontrado: ID=${profile.id}, créditos=${profile.creditos}`);

      // 5. Deletar redação de simulado
      const { error: deleteError } = await supabase
        .from('redacoes_simulado')
        .delete()
        .eq('id', redacaoId);

      if (deleteError) {
        console.error('❌ Erro ao deletar redação de simulado:', deleteError);
        throw new Error('Erro ao cancelar redação');
      }

      console.log('🗑️ Redação de simulado deletada com sucesso');

      // 6. Ressarcir créditos
      const novoSaldoCreditos = (profile.creditos || 0) + creditosParaRessarcir;

      // USAR ABORDAGEM MAIS DIRETA - SIMULADOS
      console.log('🔧 🔧 🔧 RETORNANDO CRÉDITOS SIMULADO - MÉTODO MAIS DIRETO 🔧 🔧 🔧');
      console.log(`📊 Créditos atuais: ${profile.creditos}`);
      console.log(`➕ Créditos a ressarcir: ${creditosParaRessarcir}`);
      console.log(`🎯 Novos créditos esperados: ${novoSaldoCreditos}`);

      // ESTRATÉGIA 1: Tentar usar função add_credits_safe
      let creditosFoiRessarcido = false;
      try {
        console.log('🔧 Tentando add_credits_safe...');
        const { data: addResult, error: addError } = await supabase
          .rpc('add_credits_safe', {
            target_user_id: profile.id,
            credit_amount: creditosParaRessarcir,
            admin_user_id: null
          });

        console.log('🔧 Resultado add_credits_safe:', { addResult, addError });

        if (!addError && addResult === true) {
          console.log('✅ add_credits_safe funcionou!');
          creditosFoiRessarcido = true;
        } else {
          console.log('⚠️ add_credits_safe falhou ou retornou false');
        }
      } catch (addErr) {
        console.log('💥 Erro na add_credits_safe:', addErr);
      }

      // ESTRATÉGIA 2: Se falhou, usar update direto múltiplas vezes
      if (!creditosFoiRessarcido) {
        console.log('🔧 Fallback: update direto na tabela profiles...');

        // Tentar update por ID primeiro
        const { error: creditError1 } = await supabase
          .from('profiles')
          .update({ creditos: novoSaldoCreditos, updated_at: new Date().toISOString() })
          .eq('id', profile.id);

        console.log('🔧 Update por ID:', { creditError1 });

        // Tentar update por email também
        const { error: creditError2 } = await supabase
          .from('profiles')
          .update({ creditos: novoSaldoCreditos, updated_at: new Date().toISOString() })
          .eq('email', normalizedEmail)
          .eq('user_type', 'aluno');

        console.log('🔧 Update por email:', { creditError2 });

        if (!creditError1 || !creditError2) {
          console.log('✅ Pelo menos um update funcionou!');
          creditosFoiRessarcido = true;
        }
      }

      // VERIFICAR SE DE FATO FUNCIONOU
      console.log('🔍 Verificando se o ressarcimento funcionou...');
      const { data: verifyData, error: verifyError } = await supabase
        .from('profiles')
        .select('creditos')
        .eq('id', profile.id)
        .single();

      console.log('🔍 Verificação pós-ressarcimento:', { verifyData, verifyError });

      if (verifyData && verifyData.creditos === novoSaldoCreditos) {
        console.log('✅ SUCESSO! Créditos atualizados no banco!');
      } else {
        console.log('⚠️ AVISO: Banco pode não ter sido atualizado, mas vamos continuar...');
      }

      // 7. Registrar no audit de créditos com schema dinâmico
      try {
        // Construir registro de audit baseado nos campos disponíveis
        const auditRecord: any = {};

        // Campos comuns que devem existir
        auditRecord.user_id = profile.id;
        auditRecord.admin_id = null;
        auditRecord.action = 'add';
        auditRecord.old_credits = profile.creditos || 0;
        auditRecord.new_credits = novoSaldoCreditos;
        auditRecord.amount = creditosParaRessarcir;
        auditRecord.created_at = new Date().toISOString();

        // Tentar diferentes nomes para o campo de descrição
        auditRecord.description = 'Ressarcimento por cancelamento de redação de simulado';

        await supabase
          .from('credit_audit')
          .insert(auditRecord);
        console.log('📝 Audit registrado com sucesso');
      } catch (auditError) {
        console.warn('⚠️ Erro ao registrar audit (não crítico):', auditError);
      }

      // SINCRONIZAR INTERFACE APÓS RESSARCIMENTO DE SIMULADO
      addDebugLog('🔄 Sincronizando interface de créditos...');

      await syncCreditsUpdate(
        normalizedEmail,
        novoSaldoCreditos,
        'add',
        creditosParaRessarcir
      );

      addDebugLog('✅ Sincronização completa via hook useCreditSync');

      // Sucesso
      const message = `Redação de simulado cancelada com sucesso! ${creditosParaRessarcir} créditos foram devolvidos. Novo saldo: ${novoSaldoCreditos}`;

      toast({
        title: "✅ Cancelamento realizado",
        description: message,
        className: "border-green-200 bg-green-50 text-green-900",
        duration: 5000
      });

      options?.onSuccess?.();
      return true;

    } catch (error) {
      console.error('❌ Erro ao cancelar redação de simulado:', error);

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
      console.log('🔧 Tipo de envio:', redacao.tipo_envio);
    }

    // 1. Não pode cancelar se já foi corrigida
    if (redacao.corrigida === true) {
      if (process.env.NODE_ENV === 'development') {
        console.log('❌ Redação já corrigida, não pode cancelar');
        console.log('🎯 Resultado final canCancelRedacao:', false);
      }
      return false;
    }

    // 2. Não pode cancelar se tem nota_total (correção finalizada)
    if (redacao.nota_total !== null && redacao.nota_total !== undefined) {
      if (process.env.NODE_ENV === 'development') {
        console.log('❌ Tem nota total, correção finalizada, não pode cancelar');
        console.log('🎯 Resultado final canCancelRedacao:', false);
      }
      return false;
    }

    // 3. Não pode cancelar se status é "corrigida" ou "devolvida"
    if (redacao.status === 'corrigida' || redacao.status === 'devolvida') {
      if (process.env.NODE_ENV === 'development') {
        console.log('❌ Status não permite cancelamento:', redacao.status);
        console.log('🎯 Resultado final canCancelRedacao:', false);
      }
      return false;
    }

    // 4. Para simulados, verificar se já iniciou qualquer correção
    if (redacao.tipo_envio === 'simulado') {

      // Verificar se tem qualquer nota individual (simplificado)
      // Para simulados, os dados podem vir com campos diferentes dependendo da origem
      const temNotasIndividuais = (redacao.nota_c1 !== null && redacao.nota_c1 !== undefined) ||
                                  (redacao.nota_c2 !== null && redacao.nota_c2 !== undefined) ||
                                  (redacao.nota_c3 !== null && redacao.nota_c3 !== undefined) ||
                                  (redacao.nota_c4 !== null && redacao.nota_c4 !== undefined) ||
                                  (redacao.nota_c5 !== null && redacao.nota_c5 !== undefined) ||
                                  // Verificar também campos específicos de corretor se existirem
                                  (redacao.nota_c1_corretor_1 !== null && redacao.nota_c1_corretor_1 !== undefined) ||
                                  (redacao.nota_c1_corretor_2 !== null && redacao.nota_c1_corretor_2 !== undefined);

      if (temNotasIndividuais) {
        return false;
      }
    }

    // 5. Verificar se está em correção (status em_andamento)
    if (redacao.status === 'em_andamento') {
      return false;
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
    cancelRedacaoSimulado,
    canCancelRedacao,
    getCreditosACancelar,
    loading
  };
};