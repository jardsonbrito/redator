import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type TurmaDisponivel = { id: string; valor: string; label: string };

export function useTurmasAtivas() {
  const [turmasDinamicas, setTurmasDinamicas] = useState<TurmaDisponivel[]>([]);

  useEffect(() => {
    supabase
      .from('turmas_alunos')
      .select('id, nome')
      .eq('ativo', true)
      .order('nome')
      .then(({ data }) => {
        setTurmasDinamicas((data || []).map(t => ({ id: t.id, valor: t.nome, label: t.nome })));
      });
  }, []);

  return { turmasDinamicas };
}
