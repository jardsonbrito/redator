import { supabase } from "@/integrations/supabase/client";

export type AttendanceStatus = 'presente' | 'ausente';

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
    const { data } = await supabase
      .from('presenca_aulas')
      .select('status, entrada_at, saida_at')
      .eq('aula_id', sessionId)
      .eq('email_aluno', studentEmail.toLowerCase())
      .maybeSingle();

    console.log('📊 Resultado da consulta de presença:', data);

    // Se existe registro de presença e tem entrada, consideramos presente
    if (data && data.entrada_at) {
      console.log('✅ Aluno presente!');
      return 'presente';
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

    // Usar inserção direta na tabela ao invés da RPC
    const agora = new Date().toISOString();

    const { error } = await supabase
      .from('presenca_aulas')
      .upsert({
        aula_id: sessionId,
        email_aluno: studentEmail.toLowerCase(),
        status: 'presente',
        entrada_at: agora
      }, {
        onConflict: 'aula_id,email_aluno'
      });

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