import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface ModeSessaoInfo {
  count: number;
  nivel: 'verde' | 'amarelo' | 'vermelho' | null; // nível da última sessão
}

export const useJarvisModeSessoes = (alunoEmail: string) => {
  const [info, setInfo] = useState<Record<string, ModeSessaoInfo>>({});

  useEffect(() => {
    if (!alunoEmail?.trim()) return;

    (supabase as any)
      .from('jarvis_sessoes_sintetizadas')
      .select('subtab_nome, habilidades, created_at')
      .eq('aluno_email', alunoEmail.toLowerCase().trim())
      .not('subtab_nome', 'is', null)
      .order('created_at', { ascending: false })
      .then(({ data }: any) => {
        const result: Record<string, ModeSessaoInfo> = {};
        for (const s of data ?? []) {
          if (!s.subtab_nome) continue;
          if (!result[s.subtab_nome]) {
            // Primeira entrada = sessão mais recente → define o nível
            const habs = (s.habilidades ?? []) as Array<{ nivel: string }>;
            let nivel: ModeSessaoInfo['nivel'] = null;
            if (habs.length > 0) {
              if (habs.some(h => h.nivel === 'vermelho')) nivel = 'vermelho';
              else if (habs.some(h => h.nivel === 'amarelo')) nivel = 'amarelo';
              else nivel = 'verde';
            }
            result[s.subtab_nome] = { count: 1, nivel };
          } else {
            result[s.subtab_nome].count++;
          }
        }
        setInfo(result);
      });
  }, [alunoEmail]);

  return info;
};
