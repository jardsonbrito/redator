import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface TutorConversa {
  id:             string;
  titulo:         string | null;
  status:         string;
  tokens_total:   number;
  creditos_total: number;
  created_at:     string;
  updated_at:     string;
}

export const useTutorConversas = (alunoEmail: string, modulo = 'tutor') => {
  const [conversas, setConversas]   = useState<TutorConversa[]>([]);
  const [loading, setLoading]       = useState(true);

  const carregar = useCallback(async () => {
    if (!alunoEmail?.trim()) { setLoading(false); return; }
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('get_tutor_conversas_by_email', {
        p_email:  alunoEmail.toLowerCase().trim(),
        p_modulo: modulo,
      });
      if (error) throw error;
      setConversas((data as TutorConversa[]) ?? []);
    } catch (err) {
      console.error('Erro ao carregar conversas:', err);
    } finally {
      setLoading(false);
    }
  }, [alunoEmail, modulo]);

  useEffect(() => { carregar(); }, [carregar]);

  const arquivar = async (conversationId: string): Promise<void> => {
    await supabase.rpc('archive_tutor_conversa', {
      p_conversation_id: conversationId,
      p_aluno_email:     alunoEmail.toLowerCase().trim(),
    });
    await carregar();
  };

  return { conversas, loading, refetch: carregar, arquivar };
};
