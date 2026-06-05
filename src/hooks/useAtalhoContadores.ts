import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const useAtalhoContadores = (alunoEmail: string) => {
  const [contadores, setContadores] = useState<Record<string, number>>({});
  const [tick, setTick]             = useState(0);

  const refetch = useCallback(() => setTick(t => t + 1), []);

  useEffect(() => {
    if (!alunoEmail?.trim()) return;

    (async () => {
      const { data, error } = await (supabase as any)
        .rpc('get_atalho_contadores_by_email', { p_email: alunoEmail.toLowerCase().trim() });

      if (error) { console.error('useAtalhoContadores:', error); return; }

      const result: Record<string, number> = {};
      for (const row of data ?? []) {
        if (row.atalho_id) result[row.atalho_id] = Number(row.total);
      }
      setContadores(result);
    })();
  }, [alunoEmail, tick]);

  return { contadores, refetchContadores: refetch };
};
