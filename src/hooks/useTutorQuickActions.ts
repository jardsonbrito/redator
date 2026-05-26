import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface TutorQuickAction {
  id: string;
  label: string;
  texto: string;
  icone: string;
  ordem: number;
  ativo: boolean;
}

export const useTutorQuickActions = () => {
  const [actions, setActions]   = useState<TutorQuickAction[]>([]);
  const [isLoading, setLoading] = useState(true);

  const load = async () => {
    try {
      setLoading(true);
      const { data, error } = await (supabase as any)
        .from('tutor_quick_actions')
        .select('id, label, texto, icone, ordem')
        .eq('ativo', true)
        .order('ordem', { ascending: true });
      if (error) throw error;
      setActions((data as TutorQuickAction[]) ?? []);
    } catch (err) {
      console.error('Erro ao carregar ações rápidas do tutor:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  return { actions, isLoading, refetch: load };
};
