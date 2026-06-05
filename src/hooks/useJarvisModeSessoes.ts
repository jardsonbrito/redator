import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface ModeSessaoInfo {
  count: number;
  nivel: 'verde' | 'amarelo' | 'vermelho' | null;
}

export const useJarvisModeSessoes = (alunoEmail: string) => {
  const [info, setInfo]       = useState<Record<string, ModeSessaoInfo>>({});
  const [tick, setTick]       = useState(0);

  const refetch = useCallback(() => setTick(t => t + 1), []);

  useEffect(() => {
    if (!alunoEmail?.trim()) return;

    const email = alunoEmail.toLowerCase().trim();

    (async () => {
      // 1. Busca aluno_id pelo email
      const { data: perfil } = await (supabase as any)
        .from('profiles')
        .select('id')
        .eq('email', email)
        .single();

      if (!perfil?.id) return;

      // 2. Conta conversas por modo (dot aparece ao clicar o botão, sem precisar de síntese)
      const { data: convs } = await (supabase as any)
        .from('jarvis_conversations')
        .select('subtab_id')
        .eq('aluno_id', perfil.id)
        .not('subtab_id', 'is', null);

      // 3. Busca nomes dos subtabs referenciados
      const subtabIds = [...new Set<string>((convs ?? []).map((c: any) => c.subtab_id))];
      const subtabNomeMap: Record<string, string> = {};

      if (subtabIds.length > 0) {
        const { data: subtabs } = await (supabase as any)
          .from('jarvis_tutoria_subtabs')
          .select('id, nome')
          .in('id', subtabIds);
        for (const s of subtabs ?? []) subtabNomeMap[s.id] = s.nome;
      }

      // 4. Monta resultado base (count por nome do modo)
      const result: Record<string, ModeSessaoInfo> = {};
      for (const c of convs ?? []) {
        const nome = subtabNomeMap[c.subtab_id];
        if (!nome) continue;
        if (!result[nome]) result[nome] = { count: 0, nivel: null };
        result[nome].count++;
      }

      // 5. Nível vem da síntese mais recente por modo
      const { data: sinteses } = await (supabase as any)
        .from('jarvis_sessoes_sintetizadas')
        .select('subtab_nome, habilidades, created_at')
        .eq('aluno_email', email)
        .not('subtab_nome', 'is', null)
        .order('created_at', { ascending: false });

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
