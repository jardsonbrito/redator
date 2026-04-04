import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface TutoriaSubtab {
  id: string;
  nome: string;
  label: string;
  ordem: number;
  habilitada: boolean;
  config: {
    instrucao_aluno?: string;
    campos?: Array<{
      nome: string;
      label: string;
      tipo: 'text' | 'textarea';
      placeholder?: string;
    }>;
    creditos_consumo?: number;
  };
}

export const useJarvisTutoriaSubtabs = (modoId: string | null) => {
  const [subtabs, setSubtabs] = useState<TutoriaSubtab[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!modoId) {
      setSubtabs([]);
      setLoading(false);
      return;
    }

    const fetchSubtabs = async () => {
      try {
        setLoading(true);
        setError(null);

        const { data, error: rpcError } = await supabase
          .rpc('get_tutoria_subtabs', { p_modo_id: modoId });

        if (rpcError) {
          console.error('Erro ao buscar subtabs:', rpcError);
          setError(rpcError.message);
          setSubtabs([]);
          return;
        }

        setSubtabs((data || []) as TutoriaSubtab[]);
      } catch (err) {
        console.error('Erro ao buscar subtabs:', err);
        setError(err instanceof Error ? err.message : 'Erro desconhecido');
        setSubtabs([]);
      } finally {
        setLoading(false);
      }
    };

    fetchSubtabs();
  }, [modoId]);

  return { subtabs, loading, error };
};
