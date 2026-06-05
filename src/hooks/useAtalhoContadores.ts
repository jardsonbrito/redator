import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const useAtalhoContadores = (alunoEmail: string) => {
  const [contadores, setContadores] = useState<Record<string, number>>({});
  const [tick, setTick]             = useState(0);

  const refetch = useCallback(() => setTick(t => t + 1), []);

  useEffect(() => {
    if (!alunoEmail?.trim()) return;

    const email = alunoEmail.toLowerCase().trim();

    (async () => {
      const { data: perfil } = await (supabase as any)
        .from('profiles')
        .select('id')
        .eq('email', email)
        .single();

      if (!perfil?.id) return;

      const { data: convs } = await (supabase as any)
        .from('jarvis_conversations')
        .select('atalho_id')
        .eq('aluno_id', perfil.id)
        .not('atalho_id', 'is', null);

      const result: Record<string, number> = {};
      for (const c of convs ?? []) {
        if (!c.atalho_id) continue;
        result[c.atalho_id] = (result[c.atalho_id] ?? 0) + 1;
      }
      setContadores(result);
    })();
  }, [alunoEmail, tick]);

  return { contadores, refetchContadores: refetch };
};
