import { useState, useRef, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Play, Pause, Volume2 } from 'lucide-react';

interface Props {
  /** URL direta (para áudio com URL externa) */
  url?: string;
  /** Path no bucket micro-audio (para áudio enviado via upload) */
  storagePath?: string;
  /** Duração em segundos conhecida externamente (webm gravado não tem metadata de duração) */
  durationHint?: number;
  onPlay?: () => void;
  onEnded?: () => void;
}

export const AudioPlayer = ({ url, storagePath, durationHint, onPlay, onEnded }: Props) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [srcResolvido, setSrcResolvido] = useState<string | null>(null);
  const [erroCarregar, setErroCarregar] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [progresso, setProgresso] = useState(0);
  const [duracao, setDuracao] = useState(durationHint ?? 0);
  const [currentTime, setCurrentTime] = useState(0);
  const onEndedRef = useRef(onEnded);
  onEndedRef.current = onEnded;

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
      const d = (audio.duration && isFinite(audio.duration))
        ? audio.duration
        : (durationHint ?? 0);
      if (d > 0) {
        setProgresso(audio.currentTime / d);
        setCurrentTime(audio.currentTime);
      }
    };
    // loadedmetadata e durationchange — webm gravado via MediaRecorder reporta
    // duration=Infinity; usa durationHint como fallback e atualiza se o browser calcular o real
    const onDuration = () => {
      if (audio.duration && isFinite(audio.duration)) {
        setDuracao(audio.duration);
      } else if (durationHint) {
        setDuracao(durationHint);
      }
    };
    const onEndedEvt = () => { setPlaying(false); onEndedRef.current?.(); };
    const onError = () => { setPlaying(false); setErroCarregar(true); };

    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('loadedmetadata', onDuration);
    audio.addEventListener('durationchange', onDuration);
    audio.addEventListener('ended', onEndedEvt);
    audio.addEventListener('error', onError);

    audio.load();

    return () => {
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('loadedmetadata', onDuration);
      audio.removeEventListener('durationchange', onDuration);
      audio.removeEventListener('ended', onEndedEvt);
      audio.removeEventListener('error', onError);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [srcResolvido]);

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
    if (!audio) return;
    const d = (audio.duration && isFinite(audio.duration)) ? audio.duration : (durationHint ?? 0);
    if (!d) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = (e.clientX - rect.left) / rect.width;
    audio.currentTime = pct * d;
  };

  const formatTime = (s: number) => {
    if (!isFinite(s) || isNaN(s) || s === 0) return '0:00';
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
    <div className="flex items-center gap-3 px-3 py-2 bg-violet-50 border border-violet-200 rounded-lg">
      <audio ref={audioRef} src={srcResolvido} preload="metadata" />

      <Button
        onClick={togglePlay}
        size="sm"
        className="w-8 h-8 rounded-full bg-[#3f0776] hover:bg-[#643293] shrink-0 p-0"
      >
        {playing ? <Pause className="w-3.5 h-3.5 text-white" /> : <Play className="w-3.5 h-3.5 text-white ml-0.5" />}
      </Button>

      <div
        className="flex-1 h-1.5 bg-violet-200 rounded-full cursor-pointer overflow-hidden"
        onClick={seek}
      >
        <div
          className="h-full bg-[#3f0776] rounded-full transition-all"
          style={{ width: `${progresso * 100}%` }}
        />
      </div>

      <span className="text-xs text-violet-700 font-mono shrink-0 min-w-[36px] text-right">
        {`-${formatTime(duracao - currentTime)}`}
      </span>
    </div>
  );
};
