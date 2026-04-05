import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Play, Pause, Volume2 } from 'lucide-react';

interface Props {
  url: string;
  onPlay?: () => void;
  onEnded?: () => void;
}

export const AudioPlayer = ({ url, onPlay, onEnded }: Props) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [progresso, setProgresso] = useState(0);
  const [duracao, setDuracao] = useState(0);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onTimeUpdate = () => {
      if (audio.duration) setProgresso(audio.currentTime / audio.duration);
    };
    const onLoaded = () => setDuracao(audio.duration);
    const onEndedEvt = () => { setPlaying(false); onEnded?.(); };

    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('loadedmetadata', onLoaded);
    audio.addEventListener('ended', onEndedEvt);
    return () => {
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('loadedmetadata', onLoaded);
      audio.removeEventListener('ended', onEndedEvt);
    };
  }, [onEnded]);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) {
      audio.pause();
      setPlaying(false);
    } else {
      audio.play();
      setPlaying(true);
      onPlay?.();
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
    if (!isFinite(s)) return '0:00';
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  return (
    <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
      <audio ref={audioRef} src={url} preload="metadata" />

      {/* Ícone + título */}
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

      {/* Barra de progresso */}
      <div
        className="w-full h-2 bg-gray-100 rounded-full cursor-pointer mb-3 relative overflow-hidden"
        onClick={seek}
      >
        <div
          className="h-full bg-[#3f0776] rounded-full transition-all"
          style={{ width: `${progresso * 100}%` }}
        />
      </div>

      {/* Tempo */}
      <div className="flex justify-between text-xs text-gray-400 mb-4">
        <span>{formatTime((audioRef.current?.currentTime) ?? 0)}</span>
        <span>{formatTime(duracao)}</span>
      </div>

      {/* Play/Pause */}
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
