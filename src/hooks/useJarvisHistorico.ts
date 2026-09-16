import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { CampoResposta } from '@/hooks/useJarvisModos';

export interface JarvisHistoricoItem {
  id: string;
  texto_original: string;
  // Campos legados do modo "analisar" (podem ser null em modos futuros)
  diagnostico: string | null;
  sugestao_reescrita: string | null;
  versao_melhorada: string | null;
  // Resposta genérica (presente em todas as interações novas)
  resposta_json: Record<string, string> | null;
  palavras_original: number;
  palavras_melhorada: number | null;
  // Info do modo
  modo_id: string | null;
  modo_nome: string | null;
  modo_label: string | null;
  modo_campos_resposta: CampoResposta[] | null;
  // Campos de tutoria (modos interativos)
  subtab_nome: string | null;
  etapa: string | null;
  sessao_id: string | null;
  creditos_consumidos: number;
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
