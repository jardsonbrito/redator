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
    const { data, error } = await supabase.rpc('registrar_entrada_email', { 
      p_aula_id: sessionId 
    });
    
    if (error) throw error;
    
    // Verificar resposta da função
    if (data === 'usuario_nao_autenticado') {
      throw new Error('Usuário não autenticado');
    } else if (data === 'entrada_ja_registrada') {
      throw new Error('Entrada já registrada');
    } else if (data === 'erro_interno') {
      throw new Error('Erro interno do sistema');
    } else if (data !== 'entrada_ok') {
      throw new Error('Erro desconhecido');
    }
  } catch (error) {
    console.error('Error registering attendance:', error);
    throw error;
  }
}