import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type TurmaDisponivel = { valor: string; label: string };

export function useTurmasAtivas() {
  const [turmasDinamicas, setTurmasDinamicas] = useState<TurmaDisponivel[]>([]);

  useEffect(() => {
    supabase
      .from('turmas_alunos')
      .select('nome')
      .eq('ativo', true)
      .order('nome')
      .then(({ data }) => {
        setTurmasDinamicas((data || []).map(t => ({ valor: t.nome, label: t.nome })));
      });
  }, []);

  return { turmasDinamicas };
}
