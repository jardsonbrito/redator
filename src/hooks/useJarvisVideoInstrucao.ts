import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface JarvisVideoConfig {
  id: string;
  titulo: string;
  url_youtube: string;
  atualizado_em: string;
}

const STORAGE_KEY = 'jarvis_video_instrucao_assistido';

const versaoVideo = (config: Pick<JarvisVideoConfig, 'id' | 'atualizado_em'>) =>
  `${config.id}:${config.atualizado_em}`;

export function useJarvisVideoInstrucao() {
  const [config, setConfig] = useState<JarvisVideoConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [modalAberto, setModalAberto] = useState(false);

  useEffect(() => {
    const carregar = async () => {
      const { data } = await supabase
        .from('jarvis_video_instrucao')
        .select('id, titulo, url_youtube, atualizado_em')
        .order('atualizado_em', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (data?.url_youtube) {
        const videoConfig = data as JarvisVideoConfig;
        setConfig(videoConfig);
        const assistido = localStorage.getItem(STORAGE_KEY);
        if (assistido !== versaoVideo(videoConfig)) {
          setModalAberto(true);
        }
      }
      setLoading(false);
    };
    carregar();
  }, []);

  const dispensar = () => {
    if (config) {
      localStorage.setItem(STORAGE_KEY, versaoVideo(config));
    }
    setModalAberto(false);
  };

  const abrirModal = () => setModalAberto(true);

  return { config, loading, modalAberto, dispensar, abrirModal };
}
