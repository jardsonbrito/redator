import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface RedacaoExemplarModelo {
  id: string;
  redacao_id: string;
  titulo: string;
  conteudo: string;
  ordem: number;
  criado_em: string;
}

export function useRedacaoExemplarModelos(redacaoId: string | undefined) {
  const [modelos, setModelos] = useState<RedacaoExemplarModelo[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!redacaoId) return;
    setLoading(true);
    supabase
      .from('redacao_exemplar_modelos' as any)
      .select('*')
      .eq('redacao_id', redacaoId)
      .order('ordem', { ascending: true })
      .then(({ data }) => {
        setModelos((data as RedacaoExemplarModelo[]) || []);
        setLoading(false);
      });
  }, [redacaoId]);

  return { modelos, loading };
}
