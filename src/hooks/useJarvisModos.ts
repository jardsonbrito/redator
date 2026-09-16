import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface CampoResposta {
  chave: string;
  rotulo: string;
  cor: 'blue' | 'purple' | 'green' | 'amber' | 'gray';
  copiavel?: boolean;
}

export interface JarvisModo {
  id: string;
  nome: string;
  label: string;
  descricao: string | null;
  icone: string;
  campos_resposta: CampoResposta[];
  ordem: number;
  tipo_modo?: 'simples' | 'interativo';  // Novo campo para diferenciar tipos
  config_interativa?: any;  // Configuração de modos interativos
}

export const useJarvisModos = () => {
  const [modos, setModos] = useState<JarvisModo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchModos = async () => {
      try {
        const { data, error } = await supabase.rpc('get_jarvis_modos_ativos');
        if (!error && data) {
          setModos(data as JarvisModo[]);
        }
      } finally {
        setLoading(false);
      }
    };
    fetchModos();
  }, []);

  return { modos, loading };
};
