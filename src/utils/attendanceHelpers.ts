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
    
    // Se não encontrou no localStorage, tentar Supabase Auth (fallback)
    if (!studentEmail) {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('email')
          .eq('id', user.id)
          .single();
        studentEmail = profile?.email || null;
      }
    }

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

    console.log('🔄 Registrando entrada para:', studentEmail, 'na aula:', sessionId);

    // Teste de conectividade da tabela
    const { data: testData, error: testError } = await supabase
      .from('presenca_aulas')
      .select('count')
      .limit(1);

    console.log('🔗 Teste de conectividade da tabela:', { testData, testError });

    // Verificar se já existe registro
    const { data: existingRecord } = await supabase
      .from('presenca_aulas')
      .select('*')
      .eq('aula_id', sessionId)
      .eq('email_aluno', studentEmail.toLowerCase())
      .single();

    console.log('📋 Registro existente:', existingRecord);

    // Usar inserção direta na tabela ao invés da RPC
    const agora = new Date().toISOString();

    const recordData = {
      aula_id: sessionId,
      email_aluno: studentEmail.toLowerCase(),
      status: 'presente',
      entrada_at: agora
    };

    console.log('📝 Dados a serem inseridos:', recordData);

    let result;
    if (existingRecord) {
      // Atualizar registro existente
      result = await supabase
        .from('presenca_aulas')
        .update({
          status: 'presente',
          entrada_at: agora
        })
        .eq('aula_id', sessionId)
        .eq('email_aluno', studentEmail.toLowerCase());
    } else {
      // Inserir novo registro
      result = await supabase
        .from('presenca_aulas')
        .insert(recordData);
    }

    const { error, data } = result;

    console.log('📊 Resultado da operação:', { error, data });

    if (error) {
      console.error('Erro ao inserir presença:', error);
      throw new Error(`Erro ao registrar presença: ${error.message}`);
    }

    console.log('✅ Entrada registrada com sucesso!');
  } catch (error) {
    console.error('Error registering attendance:', error);
    throw error;
  }
}

export async function registrarSaida(sessionId: string): Promise<void> {
  try {
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

    // Atualizar registro de presença com horário de saída
    const agora = new Date().toISOString();

    const { error } = await supabase
      .from('presenca_aulas')
      .update({
        saida_at: agora
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