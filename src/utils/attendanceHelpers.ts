import { supabase } from "@/integrations/supabase/client";

export type AttendanceStatus = 'presente' | 'ausente' | 'entrada_registrada' | 'saida_registrada';

/**
 * Resolve a identidade do usuário atual a partir do localStorage.
 * professor_session tem prioridade sobre qualquer outra sessão,
 * pois o professor pode ter dados de visitante/aluno residuais.
 */
function resolveUserIdentity(): {
  email: string | null;
  nome: string | null;
  turma: string | null;
} {
  // 1. Professor tem prioridade máxima
  const professorSession = localStorage.getItem("professor_session");
  if (professorSession) {
    try {
      const dados = JSON.parse(professorSession);
      if (dados.email) {
        return {
          email: dados.email,
          nome: dados.nome_completo || 'Professor',
          turma: 'Professor',
        };
      }
    } catch (e) {
      console.error('Erro ao parsear professor_session:', e);
    }
  }

  // 2. Aluno
  const userType = localStorage.getItem("userType");
  if (userType === "aluno") {
    const alunoData = localStorage.getItem("alunoData");
    if (alunoData) {
      try {
        const dados = JSON.parse(alunoData);
        if (dados.email) {
          return {
            email: dados.email,
            nome: dados.nome || 'Aluno',
            turma: dados.turma || 'Não informado',
          };
        }
      } catch (e) {
        console.error('Erro ao parsear dados do aluno:', e);
      }
    }
  }

  // 3. Visitante
  if (userType === "visitante") {
    const visitanteData = localStorage.getItem("visitanteData");
    if (visitanteData) {
      try {
        const dados = JSON.parse(visitanteData);
        if (dados.email) {
          return {
            email: dados.email,
            nome: dados.nome || 'Visitante',
            turma: 'Visitante',
          };
        }
      } catch (e) {
        console.error('Erro ao parsear dados do visitante:', e);
      }
    }
  }

  return { email: null, nome: null, turma: null };
}

export async function getMyAttendanceStatus(sessionId: string): Promise<AttendanceStatus> {
  try {
    const { email: studentEmail } = resolveUserIdentity();

    if (!studentEmail) {
      console.warn('Nenhum email de usuário encontrado');
      return 'ausente';
    }

    console.log('🔍 Verificando presença para:', studentEmail, 'na aula:', sessionId);

    const { data, error } = await supabase
      .from('presenca_aulas')
      .select('status, entrada_at, saida_at')
      .eq('aula_id', sessionId)
      .eq('email_aluno', studentEmail.toLowerCase())
      .maybeSingle();

    console.log('📊 Resultado da consulta de presença:', { data, error });

    if (error) {
      console.error('❌ Erro ao buscar presença:', error);
    }

    if (data && data.entrada_at) {
      if (data.saida_at) {
        console.log('✅ Entrada e saída registradas!');
        return 'saida_registrada';
      } else {
        console.log('✅ Entrada registrada!');
        return 'entrada_registrada';
      }
    }

    console.log('❌ Ausente ou sem registro');
    return 'ausente';
  } catch (error) {
    console.error('Error getting attendance status:', error);
    return 'ausente';
  }
}

export async function registrarEntrada(sessionId: string): Promise<void> {
  try {
    console.log('🚀 Iniciando registro de entrada para aula:', sessionId);

    const { email: studentEmail, nome: studentName, turma: studentTurma } = resolveUserIdentity();

    if (!studentEmail) {
      throw new Error('Usuário não identificado. Faça login novamente.');
    }

    console.log('🔄 Registrando entrada para:', studentEmail, 'turma:', studentTurma, 'na aula:', sessionId);

    // Tentar via RPC
    console.log('🔄 Tentando via RPC registrar_entrada_email_param...');

    try {
      const { data: rpcData, error: rpcError } = await supabase.rpc('registrar_entrada_email_param', {
        p_aula_id: sessionId,
        p_email_aluno: studentEmail.toLowerCase()
      });

      console.log('📊 Resultado RPC registrar_entrada_email_param:', { rpcData, rpcError });

      if (rpcError) {
        console.error('❌ Erro na RPC registrar_entrada_email_param:', rpcError);
        throw rpcError;
      }

      if (rpcData === 'entrada_ok' || rpcData === 'entrada_atualizada') {
        console.log('✅ Entrada registrada com sucesso via RPC!');
        return;
      }
    } catch (rpcError) {
      console.error('❌ Erro ao tentar RPC registrar_entrada_email_param:', rpcError);

      // Fallback: inserção direta na tabela
      console.log('🔄 Tentando inserção direta na tabela...');

      try {
        const { data: existingRecord } = await supabase
          .from('presenca_aulas')
          .select('*')
          .eq('aula_id', sessionId)
          .eq('email_aluno', studentEmail.toLowerCase())
          .single();

        console.log('📋 Registro existente:', existingRecord);

        const agora = new Date().toISOString();
        let result;

        if (existingRecord) {
          console.log('🔄 Atualizando registro existente...');
          result = await supabase
            .from('presenca_aulas')
            .update({ entrada_at: agora, tipo_registro: 'entrada' })
            .eq('aula_id', sessionId)
            .eq('email_aluno', studentEmail.toLowerCase());
        } else {
          console.log('➕ Inserindo novo registro...');
          const recordData = {
            aula_id: sessionId,
            email_aluno: studentEmail.toLowerCase(),
            nome_aluno: studentName,
            turma: studentTurma,
            entrada_at: agora,
            tipo_registro: 'entrada'
          };

          console.log('📝 Dados a serem inseridos:', recordData);
          result = await supabase.from('presenca_aulas').insert(recordData);
        }

        const { error, data } = result;
        console.log('📊 Resultado da operação direta:', { error, data });

        if (error) {
          console.error('❌ Erro na operação direta:', error);
          throw error;
        }

        console.log('✅ Entrada registrada com sucesso via operação direta!');
      } catch (directError) {
        console.error('❌ Erro completo ao registrar:', directError);
        throw directError;
      }
    }
  } catch (error) {
    console.error('Error registering attendance:', error);
    throw error;
  }
}

export async function registrarSaida(sessionId: string): Promise<void> {
  try {
    console.log('🚀 Iniciando registro de saída para aula:', sessionId);

    const { email: studentEmail } = resolveUserIdentity();

    if (!studentEmail) {
      throw new Error('Usuário não identificado. Faça login novamente.');
    }

    console.log('🔄 Registrando saída para:', studentEmail, 'na aula:', sessionId);

    // Tentar via RPC
    try {
      const { data: rpcData, error: rpcError } = await supabase.rpc('registrar_saida_email_param', {
        p_aula_id: sessionId,
        p_email_aluno: studentEmail.toLowerCase()
      });

      console.log('📊 Resultado RPC registrar_saida_email_param:', { rpcData, rpcError });

      if (!rpcError && (rpcData === 'saida_ok' || rpcData === 'saida_atualizada')) {
        console.log('✅ Saída registrada com sucesso via RPC!');
        return;
      }
    } catch (rpcError) {
      console.error('❌ RPC de saída não encontrada ou falhou, usando operação direta');
    }

    // Fallback: atualização direta
    const agora = new Date().toISOString();

    const { error } = await supabase
      .from('presenca_aulas')
      .update({ saida_at: agora, tipo_registro: 'saida' })
      .eq('aula_id', sessionId)
      .eq('email_aluno', studentEmail.toLowerCase());

    if (error) {
      console.error('Erro ao registrar saída:', error);
      throw new Error(`Erro ao registrar saída: ${error.message}`);
    }

    console.log('✅ Saída registrada com sucesso!');
  } catch (error) {
    console.error('Error registering exit:', error);
    throw error;
  }
}
