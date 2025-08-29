
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

      // Usar a nova função RLS is_main_admin
      const { data: isMainAdmin, error: adminError } = await supabase
        .rpc('is_main_admin');

      if (adminError) {
        console.error('❌ Erro ao verificar admin:', adminError);
        return false;
      }

      console.log('✅ Status admin via RLS:', isMainAdmin);
      return isMainAdmin === true;
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

      // 4. Executar UPDATE com as novas políticas RLS
      console.log('🚀 Executando UPDATE da correção...');
      
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
        throw new Error('Erro: UPDATE não afetou nenhum registro. Verifique as políticas RLS.');
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

      // 6. Enviar email de notificação para o aluno
      try {
        const { data: redacaoCompleta } = await supabase
          .from('redacoes_enviadas')
          .select('nome_aluno, email_aluno, frase_tematica, tipo_envio')
          .eq('id', redacaoId)
          .single();

        if (redacaoCompleta?.email_aluno && redacaoCompleta?.nome_aluno) {
          const { error: emailError } = await supabase.functions.invoke('send-correction-email', {
            body: {
              redacao_id: redacaoId,
              student_email: redacaoCompleta.email_aluno,
              student_name: redacaoCompleta.nome_aluno,
              tema_titulo: redacaoCompleta.frase_tematica || 'Tema sem título',
              tipo_envio: redacaoCompleta.tipo_envio || 'Regular',
              corretor_nome: 'Administrador',
              nota: notaTotal
            }
          });

          if (emailError) {
            console.error('⚠️ Erro ao enviar email:', emailError);
          } else {
            console.log('📧 Email de correção enviado com sucesso!');
          }
        }
      } catch (emailError) {
        console.error('⚠️ Falha no envio do email (não bloqueia correção):', emailError);
      }

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
