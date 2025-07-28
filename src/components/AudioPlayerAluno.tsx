import { useState, useRef, useEffect } from "react";
import { Play, Pause } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface AudioPlayerAlunoProps {
  audioUrl: string;
  corretorNome?: string;
  corretorAvatar?: string;
}

export const AudioPlayerAluno = ({ audioUrl, corretorNome, corretorAvatar }: AudioPlayerAlunoProps) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (!audioUrl) {
      setIsLoading(false);
      setHasError(true);
      return;
    }

    const audio = audioRef.current;
    if (!audio) return;

    // Reset states
    setIsLoading(true);
    setHasError(false);
    setDuration(0);
    setCurrentTime(0);
    setIsPlaying(false);

    const handleLoadedMetadata = () => {
      console.log('🎵 Metadata carregada:', audio.duration);
      if (audio.duration && !isNaN(audio.duration) && isFinite(audio.duration)) {
        setDuration(audio.duration);
        setIsLoading(false);
      }
    };

    const handleCanPlay = () => {
      console.log('🎵 Can play:', audio.duration);
      if (!duration && audio.duration && !isNaN(audio.duration) && isFinite(audio.duration)) {
        setDuration(audio.duration);
        setIsLoading(false);
      }
    };

    const handleTimeUpdate = () => {
      if (audio.currentTime !== undefined && !isNaN(audio.currentTime) && isFinite(audio.currentTime)) {
        setCurrentTime(audio.currentTime);
      }
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
      if (audio) {
        audio.currentTime = 0;
      }
    };

    const handleError = (e: Event) => {
      console.error('❌ Erro ao carregar áudio:', e);
      setIsLoading(false);
      setHasError(true);
    };

    const handleLoadStart = () => {
      console.log('🎵 Iniciando carregamento do áudio');
      setIsLoading(true);
    };

    const handleDurationChange = () => {
      console.log('🎵 Duração mudou:', audio.duration);
      if (audio.duration && !isNaN(audio.duration) && isFinite(audio.duration)) {
        setDuration(audio.duration);
        setIsLoading(false);
      }
    };

    // Event listeners
    audio.addEventListener('loadstart', handleLoadStart);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('canplay', handleCanPlay);
    audio.addEventListener('durationchange', handleDurationChange);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError);

    // Cleanup
    return () => {
      audio.removeEventListener('loadstart', handleLoadStart);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('canplay', handleCanPlay);
      audio.removeEventListener('durationchange', handleDurationChange);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', handleError);
    };
  }, [audioUrl]);

  const formatTime = (seconds: number) => {
    if (isNaN(seconds)) return "00:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      audio.play().catch(error => {
        console.error('Erro ao reproduzir áudio:', error);
      });
      setIsPlaying(true);
    }
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const audio = audioRef.current;
    if (!audio || duration === 0) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percentage = clickX / rect.width;
    const newTime = percentage * duration;
    
    audio.currentTime = newTime;
    setCurrentTime(newTime);
  };

  if (hasError) {
    return (
      <div className="flex items-center gap-3 text-gray-500 text-sm">
        <span>🔊 Comentário do corretor</span>
        <span className="text-xs">(Erro ao carregar áudio)</span>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center gap-3 text-gray-500 text-sm">
        <span>🔊 Comentário do corretor</span>
        <span className="text-xs">Carregando áudio...</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <audio
        ref={audioRef}
        src={audioUrl}
        preload="metadata"
      />
      
      <span className="text-sm font-medium text-gray-700">🔊 Comentário do corretor</span>
      
      <Button
        onClick={togglePlay}
        size="sm"
        variant="outline"
        className="rounded-full w-8 h-8 p-0 flex-shrink-0"
        disabled={duration === 0}
      >
        {isPlaying ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
      </Button>
      
      <span className="text-xs text-gray-600 font-mono">
        {formatTime(duration)}
      </span>
    </div>
  );
};