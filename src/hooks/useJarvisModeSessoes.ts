import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface ModeSessaoInfo {
  count: number;
  nivel: 'verde' | 'amarelo' | 'vermelho' | null;
}

export const useJarvisModeSessoes = (alunoEmail: string) => {
  const [info, setInfo] = useState<Record<string, ModeSessaoInfo>>({});
  const [tick, setTick] = useState(0);

  const refetch = useCallback(() => setTick(t => t + 1), []);

  useEffect(() => {
    if (!alunoEmail?.trim()) return;

    const email = alunoEmail.toLowerCase().trim();

    (async () => {
      // 1. Contagem de conversas por modo via RPC (bypassa RLS)
      const { data: convData, error: convErr } = await (supabase as any)
        .rpc('get_mode_conversas_by_email', { p_email: email });

      if (convErr) console.error('useJarvisModeSessoes (convs):', convErr);

      const result: Record<string, ModeSessaoInfo> = {};
      for (const row of convData ?? []) {
        if (row.subtab_nome) {
          result[row.subtab_nome] = { count: Number(row.total), nivel: null };
        }
      }

      // 2. Nível vem da síntese mais recente por modo
      const { data: sinteses, error: sintErr } = await (supabase as any)
        .from('jarvis_sessoes_sintetizadas')
        .select('subtab_nome, habilidades, created_at')
        .eq('aluno_email', email)
        .not('subtab_nome', 'is', null)
        .order('created_at', { ascending: false });

      if (sintErr) console.error('useJarvisModeSessoes (sint):', sintErr);

      for (const s of sinteses ?? []) {
        if (!s.subtab_nome) continue;
        if (!result[s.subtab_nome]) result[s.subtab_nome] = { count: 0, nivel: null };
        if (result[s.subtab_nome].nivel === null) {
          const habs = (s.habilidades ?? []) as Array<{ nivel: string }>;
          let nivel: ModeSessaoInfo['nivel'] = null;
          if (habs.length > 0) {
            if (habs.some(h => h.nivel === 'vermelho')) nivel = 'vermelho';
            else if (habs.some(h => h.nivel === 'amarelo')) nivel = 'amarelo';
            else nivel = 'verde';
          }
          result[s.subtab_nome].nivel = nivel;
        }
      }

      setInfo(result);
    })();
  }, [alunoEmail, tick]);

  return { modeInfo: info, refetchModeInfo: refetch };
};
