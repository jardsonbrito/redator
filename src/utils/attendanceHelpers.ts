import { supabase } from "@/integrations/supabase/client";

export type AttendanceStatus = 'presente' | 'ausente';

export async function getMyAttendanceStatus(sessionId: string): Promise<AttendanceStatus> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return 'ausente';

    const { data } = await supabase
      .from('live_class_attendance')
      .select('status')
      .eq('session_id', sessionId)
      .eq('user_id', user.id)
      .maybeSingle();

    return (data?.status as AttendanceStatus) ?? 'ausente';
  } catch (error) {
    console.error('Error getting attendance status:', error);
    return 'ausente';
  }
}

export async function registrarEntrada(sessionId: string): Promise<void> {
  try {
    const { error } = await supabase.rpc('registrar_entrada_live_class', { 
      p_session_id: sessionId 
    });
    
    if (error) throw error;
  } catch (error) {
    console.error('Error registering attendance:', error);
    throw error;
  }
}