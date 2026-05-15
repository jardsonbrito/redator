import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface JarvisVideoConfig {
  id: string;
  titulo: string;
  url_youtube: string;
}

const STORAGE_KEY = 'jarvis_video_instrucao_dismissed';

export function useJarvisVideoInstrucao() {
  const [config, setConfig] = useState<JarvisVideoConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [modalAberto, setModalAberto] = useState(false);

  useEffect(() => {
    const carregar = async () => {
      const { data } = await supabase
        .from('jarvis_video_instrucao')
        .select('id, titulo, url_youtube')
        .order('atualizado_em', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (data?.url_youtube) {
        setConfig(data as JarvisVideoConfig);
        const dispensado = sessionStorage.getItem(STORAGE_KEY);
        if (!dispensado) {
          setModalAberto(true);
        }
      }
      setLoading(false);
    };
    carregar();
  }, []);

  const dispensar = () => {
    sessionStorage.setItem(STORAGE_KEY, '1');
    setModalAberto(false);
  };

  const abrirModal = () => setModalAberto(true);

  return { config, loading, modalAberto, dispensar, abrirModal };
}
