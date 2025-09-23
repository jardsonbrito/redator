import { supabase } from "@/integrations/supabase/client";

export type AttendanceStatus = 'presente' | 'ausente' | 'entrada_registrada' | 'saida_registrada';

export async function getMyAttendanceStatus(sessionId: string): Promise<AttendanceStatus> {
  try {
    // Tentar buscar email do contexto de estudante (localStorage)
    let studentEmail: string | null = null;
    
    // Primeiro tentar localStorage (sistema de estudantes)
    const userType = localStorage.getItem("userType");
    if (userType === "aluno") {
      const alunoData = localStorage.getItem("alunoData");
      if (alunoData) {
        try {
          const dados = JSON.parse(alunoData);
          studentEmail = dados.email;
        } catch (e) {
          console.error('Erro ao parsear dados do aluno:', e);
        }
      }
    } else if (userType === "visitante") {
      const visitanteData = localStorage.getItem("visitanteData");
      if (visitanteData) {
        try {
          const dados = JSON.parse(visitanteData);
          studentEmail = dados.email;
        } catch (e) {
          console.error('Erro ao parsear dados do visitante:', e);
        }
      }
    }
    
    // Não usar Supabase Auth para alunos, apenas localStorage

    if (!studentEmail) {
      console.warn('Nenhum email de estudante encontrado');
      return 'ausente';
    }

    console.log('🔍 Verificando presença para:', studentEmail, 'na aula:', sessionId);

    // Buscar presença na tabela correta usando email e aula_id
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

    // Se existe registro de presença, verificar se tem entrada e/ou saída
    if (data && data.entrada_at) {
      if (data.saida_at) {
        console.log('✅ Aluno com entrada e saída registradas!');
        return 'saida_registrada';
      } else {
        console.log('✅ Aluno com entrada registrada!');
        return 'entrada_registrada';
      }
    }

    console.log('❌ Aluno ausente ou sem registro');
    return 'ausente';
  } catch (error) {
    console.error('Error getting attendance status:', error);
    return 'ausente';
  }
}

export async function registrarEntrada(sessionId: string): Promise<void> {
  try {
    console.log('🚀 Iniciando registro de entrada para aula:', sessionId);

    // Primeiro, vamos verificar se o usuário está autenticado corretamente
    let studentEmail: string | null = null;
    let studentName: string | null = null;
    let studentTurma: string | null = null;

    // Tentar buscar email do contexto de estudante (localStorage)
    const userType = localStorage.getItem("userType");
    if (userType === "aluno") {
      const alunoData = localStorage.getItem("alunoData");
      if (alunoData) {
        try {
          const dados = JSON.parse(alunoData);
          studentEmail = dados.email;
          studentName = dados.nome || 'Aluno';
          studentTurma = dados.turma || 'Não informado';
        } catch (e) {
          console.error('Erro ao parsear dados do aluno:', e);
        }
      }
    } else if (userType === "visitante") {
      const visitanteData = localStorage.getItem("visitanteData");
      if (visitanteData) {
        try {
          const dados = JSON.parse(visitanteData);
          studentEmail = dados.email;
          studentName = dados.nome || 'Visitante';
          studentTurma = 'Visitante';
        } catch (e) {
          console.error('Erro ao parsear dados do visitante:', e);
        }
      }
    }

    if (!studentEmail) {
      throw new Error('Usuário não identificado. Faça login novamente.');
    }

    console.log('🔄 Registrando entrada para:', studentEmail, 'na aula:', sessionId);

    // Tentar primeiro usar a RPC que aceita email como parâmetro
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

      // Se a RPC falhou, tentar inserção direta na tabela
      console.log('🔄 Tentando inserção direta na tabela...');

      try {
        // Verificar se já existe registro
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
          // Atualizar registro existente
          console.log('🔄 Atualizando registro existente...');
          result = await supabase
            .from('presenca_aulas')
            .update({
              entrada_at: agora,
              tipo_registro: 'entrada'
            })
            .eq('aula_id', sessionId)
            .eq('email_aluno', studentEmail.toLowerCase());
        } else {
          // Inserir novo registro
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

          result = await supabase
            .from('presenca_aulas')
            .insert(recordData);
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

    // Primeiro, vamos verificar se o usuário está autenticado corretamente
    let studentEmail: string | null = null;

    // Tentar buscar email do contexto de estudante (localStorage)
    const userType = localStorage.getItem("userType");
    if (userType === "aluno") {
      const alunoData = localStorage.getItem("alunoData");
      if (alunoData) {
        try {
          const dados = JSON.parse(alunoData);
          studentEmail = dados.email;
        } catch (e) {
          console.error('Erro ao parsear dados do aluno:', e);
        }
      }
    } else if (userType === "visitante") {
      const visitanteData = localStorage.getItem("visitanteData");
      if (visitanteData) {
        try {
          const dados = JSON.parse(visitanteData);
          studentEmail = dados.email;
        } catch (e) {
          console.error('Erro ao parsear dados do visitante:', e);
        }
      }
    }

    if (!studentEmail) {
      throw new Error('Usuário não identificado. Faça login novamente.');
    }

    console.log('🔄 Registrando saída para:', studentEmail, 'na aula:', sessionId);

    // Tentar primeiro usar RPC para registrar saída se existir
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

    // Atualizar registro de presença com horário de saída (método direto)
    const agora = new Date().toISOString();

    const { error } = await supabase
      .from('presenca_aulas')
      .update({
        saida_at: agora,
        tipo_registro: 'saida'
      })
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