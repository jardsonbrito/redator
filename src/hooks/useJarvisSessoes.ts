import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface Habilidade {
  label: string;
  nivel: 'verde' | 'amarelo' | 'vermelho';
}

export interface JarvisSessao {
  id: string;
  conversa_id: string | null;
  subtab_nome: string | null;
  resumo: string | null;
  habilidades: Habilidade[];
  dificuldades: string[];
  proximos_passos: string[];
  orientacao_professor: string | null;
  duracao_minutos: number;
  total_mensagens: number;
  exercicios_estimados: number;
  texto_completo: string;
  tags_dificuldades: string[];
  created_at: string;
}

export const useJarvisSessoes = (alunoEmail: string, limite = 20) => {
  const [sessoes, setSessoes]   = useState<JarvisSessao[]>([]);
  const [loading, setLoading]   = useState(true);

  const carregar = useCallback(async () => {
    if (!alunoEmail?.trim()) { setLoading(false); return; }
    setLoading(true);
    try {
      const { data, error } = await (supabase as any)
        .from('jarvis_sessoes_sintetizadas')
        .select('*')
        .eq('aluno_email', alunoEmail.toLowerCase().trim())
        .order('created_at', { ascending: false })
        .limit(limite);
      if (error) throw error;
      setSessoes((data ?? []) as JarvisSessao[]);
    } catch (err) {
      console.error('Erro ao carregar sessões:', err);
    } finally {
      setLoading(false);
    }
  }, [alunoEmail, limite]);

  useEffect(() => { carregar(); }, [carregar]);

  return { sessoes, loading, refetch: carregar };
};
