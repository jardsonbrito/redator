
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

      // Para o email específico, sempre retorna true
      if (userEmail === 'jardsonbrito@gmail.com') {
        console.log('✅ Admin confirmado pelo email hardcoded');
        return true;
      }

      // Verificação adicional via RPC como fallback
      try {
        const { data: adminCheck, error: adminError } = await supabase
          .rpc('is_admin', { user_id: session.session.user.id });

        if (adminError) {
          console.warn('⚠️ Erro na função RPC is_admin:', adminError);
          // Para o admin principal, ignorar erro de RPC
          return userEmail === 'jardsonbrito@gmail.com';
        }

        console.log('✅ Status admin via RPC:', adminCheck);
        return adminCheck === true;
      } catch (rpcError) {
        console.warn('⚠️ Falha na verificação RPC:', rpcError);
        // Para o admin principal, sempre permitir
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
      console.log('🚀 Iniciando processo de correção para:', redacaoId);

      // 1. Verificar permissões de admin
      const isAdmin = await validarPermissaoAdmin();
      if (!isAdmin) {
        throw new Error('Acesso negado: Permissões de administrador necessárias');
      }

      console.log('✅ Permissões de admin confirmadas');

      // 2. Verificar se a redação existe
      const redacaoExistente = await verificarExistenciaRedacao(redacaoId);
      console.log('✅ Redação confirmada:', redacaoExistente.id);

      // 3. Preparar dados para correção
      const { updateData, notaTotal } = prepararDadosCorrecao(dados);

      // 4. Executar UPDATE com lógica robusta
      console.log('🚀 Executando UPDATE da correção...');
      
      // Primeiro, tentar o update normal
      const { data: updateResult, error: updateError } = await supabase
        .from('redacoes_enviadas')
        .update(updateData)
        .eq('id', redacaoId)
        .select('*');

      if (updateError) {
        console.error('❌ Erro no UPDATE:', updateError);
        throw new Error(`Erro ao salvar correção: ${updateError.message}`);
      }

      if (!updateResult || updateResult.length === 0) {
        console.error('❌ UPDATE não retornou dados');
        
        // Tentar uma segunda verificação para ver se a redação ainda existe
        const { data: recheck } = await supabase
          .from('redacoes_enviadas')
          .select('id')
          .eq('id', redacaoId)
          .single();
        
        if (!recheck) {
          throw new Error('Redação não encontrada no momento da atualização');
        }
        
        throw new Error(`UPDATE não afetou registros. Redação existe: ${recheck.id}, mas não foi possível atualizar. Verifique as políticas RLS.`);
      }

      const resultadoFinal = updateResult[0];
      console.log('✅ Correção salva com sucesso!', resultadoFinal);

      // 5. Verificação final para confirmar que foi salvo
      const { data: verificacao } = await supabase
        .from('redacoes_enviadas')
        .select('id, corrigida, nota_total, nota_c1, nota_c2, nota_c3, nota_c4, nota_c5')
        .eq('id', redacaoId)
        .single();

      if (!verificacao?.corrigida) {
        throw new Error('Correção não foi persistida corretamente no banco de dados');
      }

      console.log('✅ Verificação final bem-sucedida:', verificacao);

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
