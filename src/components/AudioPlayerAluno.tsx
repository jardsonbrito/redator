import { useState, useRef, useEffect } from "react";
import { Play, Pause, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface AudioPlayerAlunoProps {
  audioUrl: string;
  corretorNome?: string;
  corretorAvatar?: string;
}

export const AudioPlayerAluno = ({ audioUrl, corretorNome, corretorAvatar }: AudioPlayerAlunoProps) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [isReady, setIsReady] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [useNativePlayer, setUseNativePlayer] = useState(false);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Verificar se URL é válida
  if (!audioUrl || !audioUrl.trim()) {
    return null;
  }

  useEffect(() => {
    console.log('🎵 AudioPlayerAluno montado com URL:', audioUrl);
    
    const audio = audioRef.current;
    if (!audio) {
      console.log('❌ Ref do audio não encontrada');
      return;
    }

    // Reset states
    setIsReady(false);
    setHasError(false);
    setDuration(0);
    setIsPlaying(false);

    const handleLoadedMetadata = () => {
      console.log('✅ Metadata carregada, duração:', audio.duration);
      if (audio.duration && !isNaN(audio.duration) && isFinite(audio.duration)) {
        setDuration(audio.duration);
        setIsReady(true);
      }
    };

    const handleCanPlay = () => {
      console.log('✅ Can play evento disparado');
      if (!isReady) {
        setIsReady(true);
        if (audio.duration && !isNaN(audio.duration) && isFinite(audio.duration)) {
          setDuration(audio.duration);
        }
      }
    };

    const handleError = (e: Event) => {
      console.error('❌ Erro ao carregar áudio:', e);
      setHasError(true);
      setIsReady(false);
      // Fallback para player nativo após 3 segundos
      setTimeout(() => {
        setUseNativePlayer(true);
      }, 3000);
    };

    const handleLoadStart = () => {
      console.log('🔄 Começando a carregar áudio...');
    };

    // Event listeners
    audio.addEventListener('loadstart', handleLoadStart);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('canplay', handleCanPlay);
    audio.addEventListener('error', handleError);

    // Cleanup
    return () => {
      audio.removeEventListener('loadstart', handleLoadStart);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('canplay', handleCanPlay);
      audio.removeEventListener('error', handleError);
    };
  }, [audioUrl, isReady]);

  // Timeout fallback - se não carregar em 5 segundos, usar player nativo
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (!isReady && !hasError) {
        console.log('⏰ Timeout atingido, usando player nativo');
        setUseNativePlayer(true);
      }
    }, 5000);

    return () => clearTimeout(timeout);
  }, [isReady, hasError]);

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
        console.error('❌ Erro ao reproduzir áudio:', error);
        setHasError(true);
      });
      setIsPlaying(true);
    }
  };

  // Se deve usar player nativo ou teve erro muito tempo
  if (useNativePlayer || hasError) {
    return (
      <div className="flex items-center gap-3 py-2">
        <Volume2 className="w-4 h-4 text-gray-600" />
        <span className="text-sm font-medium text-gray-700">Comentário do corretor</span>
        <audio 
          controls 
          preload="metadata"
          className="max-w-[200px] h-8"
          style={{ filter: 'sepia(20%) saturate(70%) hue-rotate(200deg)' }}
        >
          <source src={audioUrl} type="audio/webm" />
          <source src={audioUrl} type="audio/mp3" />
          Seu navegador não suporta áudio.
        </audio>
      </div>
    );
  }

  // Ainda carregando
  if (!isReady) {
    return (
      <div className="flex items-center gap-3 text-gray-500 text-sm py-2">
        <audio ref={audioRef} src={audioUrl} preload="metadata" />
        <Volume2 className="w-4 h-4" />
        <span>Comentário do corretor</span>
        <span className="text-xs animate-pulse">Carregando áudio...</span>
      </div>
    );
  }

  // Player customizado pronto
  return (
    <div className="flex items-center gap-3 py-2">
      <audio
        ref={audioRef}
        src={audioUrl}
        preload="metadata"
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onEnded={() => setIsPlaying(false)}
      />
      
      <Volume2 className="w-4 h-4 text-gray-600" />
      <span className="text-sm font-medium text-gray-700">Comentário do corretor</span>
      
      <Button
        onClick={togglePlay}
        size="sm"
        variant="outline"
        className="rounded-full w-8 h-8 p-0 flex-shrink-0"
      >
        {isPlaying ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
      </Button>
      
      <span className="text-xs text-gray-600 font-mono">
        {formatTime(duration)}
      </span>
    </div>
  );
};