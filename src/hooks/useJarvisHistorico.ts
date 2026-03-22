import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface JarvisHistoricoItem {
  id: string;
  texto_original: string;
  diagnostico: string;
  sugestao_reescrita: string;
  versao_melhorada: string;
  palavras_original: number;
  palavras_melhorada: number;
  created_at: string;
}

export const useJarvisHistorico = (userEmail: string) => {
  const [historico, setHistorico] = useState<JarvisHistoricoItem[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchHistorico = async () => {
    if (!userEmail) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('get_jarvis_historico_by_email', {
        p_email: userEmail,
      });
      if (!error && data) {
        setHistorico(data as JarvisHistoricoItem[]);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistorico();
  }, [userEmail]);

  return { historico, loading, refreshHistorico: fetchHistorico };
};
