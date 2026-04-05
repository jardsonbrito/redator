import { useState, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Play, Pause, Volume2 } from 'lucide-react';

interface Props {
  /** URL direta (para áudio com URL externa) */
  url?: string;
  /** Path no bucket micro-audio (para áudio enviado via upload) */
  storagePath?: string;
  onPlay?: () => void;
  onEnded?: () => void;
}

export const AudioPlayer = ({ url, storagePath, onPlay, onEnded }: Props) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [srcResolvido, setSrcResolvido] = useState<string | null>(null);
  const [erroCarregar, setErroCarregar] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [progresso, setProgresso] = useState(0);
  const [duracao, setDuracao] = useState(0);

  // Resolver URL: se vier storagePath, gerar signed URL (evita problema de CORS)
  useEffect(() => {
    if (url) {
      setSrcResolvido(url);
      return;
    }
    if (!storagePath) return;

    supabase.storage
      .from('micro-audio')
      .createSignedUrl(storagePath, 3600) // 1 hora
      .then(({ data, error }) => {
        if (error || !data?.signedUrl) {
          setErroCarregar(true);
          return;
        }
        setSrcResolvido(data.signedUrl);
      });
  }, [url, storagePath]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !srcResolvido) return;

    const onTimeUpdate = () => {
      if (audio.duration) setProgresso(audio.currentTime / audio.duration);
    };
    const onLoaded = () => setDuracao(audio.duration);
    const onEndedEvt = () => { setPlaying(false); onEnded?.(); };
    const onError = () => { setPlaying(false); setErroCarregar(true); };

    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('loadedmetadata', onLoaded);
    audio.addEventListener('ended', onEndedEvt);
    audio.addEventListener('error', onError);

    // Forçar carregamento dos metadados quando o src é definido
    audio.load();

    return () => {
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('loadedmetadata', onLoaded);
      audio.removeEventListener('ended', onEndedEvt);
      audio.removeEventListener('error', onError);
    };
  }, [srcResolvido, onEnded]);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) {
      audio.pause();
      setPlaying(false);
    } else {
      audio.play()
        .then(() => {
          setPlaying(true);
          onPlay?.();
        })
        .catch(() => {
          setPlaying(false);
          setErroCarregar(true);
        });
    }
  };

  const seek = (e: React.MouseEvent<HTMLDivElement>) => {
    const audio = audioRef.current;
    if (!audio || !audio.duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = (e.clientX - rect.left) / rect.width;
    audio.currentTime = pct * audio.duration;
  };

  const formatTime = (s: number) => {
    if (!isFinite(s) || s === 0) return '0:00';
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  if (erroCarregar) {
    return (
      <div className="bg-white border border-red-100 rounded-2xl p-5 text-center text-sm text-red-400">
        Não foi possível carregar o áudio. Verifique o arquivo cadastrado.
      </div>
    );
  }

  if (!srcResolvido) {
    return (
      <div className="bg-white border border-gray-100 rounded-2xl p-5 h-40 flex items-center justify-center animate-pulse">
        <p className="text-sm text-gray-400">Carregando áudio...</p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
      <audio ref={audioRef} src={srcResolvido} preload="metadata" />

      <div className="flex items-center gap-3 mb-5">
        <div className="w-12 h-12 rounded-xl bg-[#3f0776] flex items-center justify-center shrink-0">
          <Volume2 className="w-6 h-6 text-white" />
        </div>
        <div>
          <p className="text-sm font-semibold text-gray-700">Reprodutor de Áudio</p>
          <p className="text-xs text-gray-400">
            {duracao ? formatTime(duracao) : '--:--'}
          </p>
        </div>
      </div>

      <div
        className="w-full h-2 bg-gray-100 rounded-full cursor-pointer mb-3 relative overflow-hidden"
        onClick={seek}
      >
        <div
          className="h-full bg-[#3f0776] rounded-full transition-all"
          style={{ width: `${progresso * 100}%` }}
        />
      </div>

      <div className="flex justify-between text-xs text-gray-400 mb-4">
        <span>{formatTime((audioRef.current?.currentTime) ?? 0)}</span>
        <span>{formatTime(duracao)}</span>
      </div>

      <div className="flex justify-center">
        <Button
          onClick={togglePlay}
          className="w-14 h-14 rounded-full bg-[#3f0776] hover:bg-[#643293] shadow-md"
        >
          {playing ? (
            <Pause className="w-6 h-6 text-white" />
          ) : (
            <Play className="w-6 h-6 text-white ml-0.5" />
          )}
        </Button>
      </div>
    </div>
  );
};
