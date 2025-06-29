
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface CorrecaoData {
  nota_c1: string;
  nota_c2: string;
  nota_c3: string;
  nota_c4: string;
  nota_c5: string;
  comentario_admin: string;
}

export interface RedacaoCorrecaoResult {
  success: boolean;
  notaTotal: number;
  redacaoId: string;
  error?: string;
}

export const useRedacaoCorrecaoHandler = () => {
  const { toast } = useToast();

  const validarPermissaoAdmin = async (): Promise<boolean> => {
    try {
      console.log('🔐 Verificando permissões de admin...');
      
      const { data: session, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session.session?.user) {
        console.error('❌ Erro de sessão:', sessionError);
        return false;
      }

      const userEmail = session.session.user.email;
      console.log('📧 Email do usuário logado:', userEmail);

      // Verificação direta por email (método mais confiável)
      if (userEmail === 'jardsonbrito@gmail.com') {
        console.log('✅ Admin verificado por email:', userEmail);
        return true;
      }

      // Verificação alternativa usando a função RPC
      try {
        const { data: adminCheck, error: adminError } = await supabase
          .rpc('is_admin', { user_id: session.session.user.id });

        if (adminError) {
          console.error('⚠️ Erro na função is_admin, mas email é admin:', adminError);
          // Se a função RPC falhou mas o email é admin, permitir acesso
          return userEmail === 'jardsonbrito@gmail.com';
        }

        console.log('✅ Status admin via RPC:', adminCheck);
        return adminCheck === true;
      } catch (rpcError) {
        console.error('⚠️ Falha na verificação RPC, usando verificação por email:', rpcError);
        return userEmail === 'jardsonbrito@gmail.com';
      }
    } catch (error) {
      console.error('❌ Erro na validação de admin:', error);
      return false;
    }
  };

  const verificarExistenciaRedacao = async (redacaoId: string) => {
    console.log('🔍 Verificando existência da redação:', redacaoId);
    
    const { data, error } = await supabase
      .from('redacoes_enviadas')
      .select('id, frase_tematica, corrigida, nota_total')
      .eq('id', redacaoId)
      .single();

    if (error) {
      console.error('❌ Erro ao verificar redação:', error);
      throw new Error(`Redação não encontrada: ${error.message}`);
    }

    console.log('✅ Redação encontrada:', data);
    return data;
  };

  const prepararDadosCorrecao = (dados: CorrecaoData) => {
    console.log('📝 Preparando dados para correção:', dados);

    // Converter e validar notas
    const notas = {
      nota_c1: dados.nota_c1 ? Math.min(200, Math.max(0, parseInt(dados.nota_c1))) : null,
      nota_c2: dados.nota_c2 ? Math.min(200, Math.max(0, parseInt(dados.nota_c2))) : null,
      nota_c3: dados.nota_c3 ? Math.min(200, Math.max(0, parseInt(dados.nota_c3))) : null,
      nota_c4: dados.nota_c4 ? Math.min(200, Math.max(0, parseInt(dados.nota_c4))) : null,
      nota_c5: dados.nota_c5 ? Math.min(200, Math.max(0, parseInt(dados.nota_c5))) : null,
    };

    // Calcular nota total
    const notaTotal = Object.values(notas).reduce((sum, nota) => sum + (nota || 0), 0);

    const updateData = {
      ...notas,
      nota_total: notaTotal,
      comentario_admin: dados.comentario_admin?.trim() || null,
      corrigida: true,
      data_correcao: new Date().toISOString(),
    };

    console.log('📊 Dados preparados:', updateData);
    return { updateData, notaTotal };
  };

  const executarCorrecao = async (redacaoId: string, dados: CorrecaoData): Promise<RedacaoCorrecaoResult> => {
    try {
      // 1. Verificar permissões de admin
      const isAdmin = await validarPermissaoAdmin();
      if (!isAdmin) {
        throw new Error('Acesso negado: Permissões de administrador necessárias');
      }

      console.log('✅ Permissões de admin confirmadas');

      // 2. Verificar se a redação existe
      await verificarExistenciaRedacao(redacaoId);

      // 3. Preparar dados para correção
      const { updateData, notaTotal } = prepararDadosCorrecao(dados);

      // 4. Executar UPDATE com retry
      console.log('🚀 Executando UPDATE da correção...');
      
      let updateResult;
      let attempts = 0;
      const maxAttempts = 3;

      while (attempts < maxAttempts) {
        attempts++;
        console.log(`📡 Tentativa ${attempts} de ${maxAttempts}...`);

        const { data, error } = await supabase
          .from('redacoes_enviadas')
          .update(updateData)
          .eq('id', redacaoId)
          .select('*');

        if (error) {
          console.error(`❌ Erro na tentativa ${attempts}:`, error);
          if (attempts === maxAttempts) {
            throw new Error(`Erro ao atualizar redação: ${error.message}`);
          }
          // Aguardar 1 segundo antes da próxima tentativa
          await new Promise(resolve => setTimeout(resolve, 1000));
          continue;
        }

        if (!data || data.length === 0) {
          console.error(`❌ UPDATE não afetou registros na tentativa ${attempts}`);
          if (attempts === maxAttempts) {
            // Fazer uma última verificação se a redação ainda existe
            const recheck = await verificarExistenciaRedacao(redacaoId);
            throw new Error(`UPDATE não afetou registros. Redação existe: ${recheck.id}, mas não foi possível atualizar. Verifique as políticas RLS.`);
          }
          await new Promise(resolve => setTimeout(resolve, 1000));
          continue;
        }

        updateResult = data[0];
        break;
      }

      if (!updateResult) {
        throw new Error('Falha ao atualizar redação após múltiplas tentativas');
      }

      console.log('✅ Correção salva com sucesso!', updateResult);

      // 5. Verificar se a correção foi realmente salva
      const verificacao = await supabase
        .from('redacoes_enviadas')
        .select('id, corrigida, nota_total, nota_c1, nota_c2, nota_c3, nota_c4, nota_c5')
        .eq('id', redacaoId)
        .single();

      if (verificacao.error || !verificacao.data?.corrigida) {
        throw new Error('Correção não foi salva corretamente. Verificação falhou.');
      }

      console.log('✅ Verificação final bem-sucedida:', verificacao.data);

      return {
        success: true,
        notaTotal,
        redacaoId,
      };

    } catch (error) {
      console.error('💥 Erro na correção:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      
      return {
        success: false,
        notaTotal: 0,
        redacaoId,
        error: errorMessage,
      };
    }
  };

  return {
    executarCorrecao,
    validarPermissaoAdmin,
  };
};
