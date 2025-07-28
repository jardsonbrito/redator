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
  
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleLoadedMetadata = () => {
      if (audio.duration && !isNaN(audio.duration) && isFinite(audio.duration)) {
        setDuration(audio.duration);
        setIsLoading(false);
      }
    };

    const handleTimeUpdate = () => {
      if (audio.currentTime && !isNaN(audio.currentTime) && isFinite(audio.currentTime)) {
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
      setIsLoading(false);
      console.error('Erro ao carregar áudio:', e);
    };

    const handleCanPlay = () => {
      // Fallback se loadedmetadata não funcionar
      if (!duration && audio.duration && !isNaN(audio.duration) && isFinite(audio.duration)) {
        setDuration(audio.duration);
        setIsLoading(false);
      }
    };

    // Adicionar múltiplos listeners para maior compatibilidade
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('canplay', handleCanPlay);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError);

    // Forçar carregamento dos metadados
    audio.load();

    return () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('canplay', handleCanPlay);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', handleError);
    };
  }, [audioUrl, duration]);

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

  if (isLoading) {
    return (
      <Card className="w-full">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Áudio do corretor</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-4 text-gray-500">
            Carregando áudio...
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Áudio do corretor</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-4">
          <audio
            ref={audioRef}
            src={audioUrl}
            preload="metadata"
          />
          
          <Button
            onClick={togglePlay}
            size="sm"
            variant="outline"
            className="rounded-full w-10 h-10 p-0 flex-shrink-0"
            disabled={duration === 0}
          >
            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          </Button>
          
          <div className="flex-1 flex items-center gap-3">
            <div 
              className="flex-1 bg-gray-200 rounded-full h-2 cursor-pointer relative overflow-hidden"
              onClick={handleSeek}
            >
              <div 
                className="bg-primary h-2 rounded-full transition-all duration-200"
                style={{ width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }}
              />
            </div>
            
            <div className="text-sm text-gray-600 font-mono min-w-[80px] text-center">
              {formatTime(currentTime)} / {formatTime(duration)}
            </div>
          </div>
          
          {(corretorNome || corretorAvatar) && (
            <div className="flex items-center gap-2 flex-shrink-0">
              <Avatar className="w-8 h-8">
                <AvatarImage src={corretorAvatar} alt={corretorNome} />
                <AvatarFallback className="text-xs">
                  {corretorNome ? corretorNome.charAt(0).toUpperCase() : 'C'}
                </AvatarFallback>
              </Avatar>
              {corretorNome && (
                <span className="text-sm text-gray-600 hidden sm:inline">
                  {corretorNome}
                </span>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};