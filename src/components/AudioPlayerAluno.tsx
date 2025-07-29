import { useState, useRef, useEffect } from "react";
import { Play, Pause, Volume2, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button";

interface AudioPlayerAlunoProps {
  audioUrl: string;
  corretorNome?: string;
  corretorAvatar?: string;
  isStudentView?: boolean; // Nova prop para distinguir visualização do aluno
}

export const AudioPlayerAluno = ({ audioUrl, corretorNome, corretorAvatar, isStudentView = false }: AudioPlayerAlunoProps) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [isReady, setIsReady] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [useNativePlayer, setUseNativePlayer] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  
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
    setCurrentTime(0);
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

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
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
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('error', handleError);

    // Cleanup
    return () => {
      audio.removeEventListener('loadstart', handleLoadStart);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('canplay', handleCanPlay);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
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

  const toggleMute = () => {
    const audio = audioRef.current;
    if (!audio) return;
    
    audio.muted = !audio.muted;
    setIsMuted(audio.muted);
  };

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const audio = audioRef.current;
    if (!audio || !duration) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const width = rect.width;
    const clickTime = (clickX / width) * duration;
    
    audio.currentTime = clickTime;
    setCurrentTime(clickTime);
  };

  const progressPercentage = duration > 0 ? (currentTime / duration) * 100 : 0;

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

  // Player customizado para visualização do aluno
  if (isStudentView) {
    return (
      <div className="audio-player-aluno flex items-center gap-4 p-3 bg-white rounded-2xl shadow-[0_2px_12px_rgba(0,0,0,0.1)] max-w-[420px] w-full border border-gray-100">
        <audio
          ref={audioRef}
          src={audioUrl}
          preload="auto"
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          onEnded={() => setIsPlaying(false)}
        />
        
        {/* Botão Play/Pause - Estilo conforme mockup */}
        <button
          onClick={togglePlay}
          className="play-button bg-[#3C0D99] text-white border-none rounded-full w-12 h-12 flex items-center justify-center cursor-pointer hover:bg-[#2d0a7a] transition-all duration-200 shadow-lg active:scale-95 flex-shrink-0"
        >
          {isPlaying ? (
            <Pause className="w-5 h-5" />
          ) : (
            <Play className="w-5 h-5 ml-0.5" />
          )}
        </button>
        
        {/* Container central da barra e tempo */}
        <div className="flex-1 flex flex-col items-center gap-3">
          {/* Barra de Progresso - Estilo conforme mockup */}
          <div 
            className="progress-bar w-full h-[6px] bg-gray-200 rounded-full relative overflow-hidden cursor-pointer"
            onClick={handleProgressClick}
          >
            <div 
              className="progress h-full bg-[#3C0D99] rounded-full transition-all duration-300 ease-out"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
          
          {/* Tempo centralizado abaixo da barra conforme mockup */}
          <div className="text-center">
            <span className="text-xl font-bold text-gray-900 tracking-wide">
              {formatTime(currentTime)}
            </span>
          </div>
        </div>
        
        {/* Botão Volume - Estilo conforme mockup */}
        <button
          onClick={toggleMute}
          className="volume-button text-gray-600 hover:text-[#3C0D99] transition-colors duration-200 p-1 flex-shrink-0"
        >
          {isMuted ? (
            <VolumeX className="w-7 h-7" />
          ) : (
            <Volume2 className="w-7 h-7" />
          )}
        </button>
      </div>
    );
  }

  // Player padrão para outros perfis
  return (
    <div className="bg-white border border-gray-200 rounded-[10px] p-3 shadow-sm">
      <audio
        ref={audioRef}
        src={audioUrl}
        preload="auto"
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onEnded={() => setIsPlaying(false)}
      />
      
      <div className="flex items-center gap-3">
        <Volume2 className="w-[18px] h-[18px] text-gray-600" />
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
    </div>
  );
};