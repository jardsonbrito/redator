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
    const audio = audioRef.current;
    if (!audio) return;

    // Simplifcar: sempre assumir que está pronto após um pequeno delay
    const timer = setTimeout(() => {
      setIsReady(true);
      if (audio.duration && !isNaN(audio.duration) && isFinite(audio.duration)) {
        setDuration(audio.duration);
      }
    }, 100);

    const handleLoadedMetadata = () => {
      if (audio.duration && !isNaN(audio.duration) && isFinite(audio.duration)) {
        setDuration(audio.duration);
        setIsReady(true);
      }
    };

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const handleError = () => {
      if (!isStudentView) {
        setUseNativePlayer(true);
      }
    };

    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('error', handleError);

    return () => {
      clearTimeout(timer);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('error', handleError);
    };
  }, [audioUrl, isStudentView]);

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

  // Para alunos, sempre mostrar o player customizado sem tela de carregamento
  if (isStudentView) {
    return (
      <div className="space-y-3">
        {/* Player de áudio */}
        <div className="audio-player-aluno flex items-center gap-2 sm:gap-3 p-3 sm:p-4 bg-white rounded-2xl shadow-[0_2px_12px_rgba(0,0,0,0.1)] max-w-[420px] w-full border border-gray-100">
          <audio
            ref={audioRef}
            src={audioUrl}
            preload="auto"
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            onEnded={() => setIsPlaying(false)}
          />
          
          {/* Botão Play/Pause circular conforme mockup - responsivo */}
          <button
            onClick={togglePlay}
            className="play-button bg-[#3C0D99] text-white border-none rounded-full w-12 h-12 sm:w-14 sm:h-14 flex items-center justify-center cursor-pointer hover:bg-[#2d0a7a] transition-all duration-200 shadow-lg active:scale-95 flex-shrink-0"
          >
            {isPlaying ? (
              <Pause className="w-5 h-5 sm:w-6 sm:h-6" />
            ) : (
              <Play className="w-5 h-5 sm:w-6 sm:h-6 ml-0.5" />
            )}
          </button>
          
          {/* Container central da barra e tempo */}
          <div className="flex-1 flex flex-col items-center gap-1.5 sm:gap-2">
            {/* Barra de Progresso horizontal */}
            <div 
              className="progress-bar w-full h-1.5 sm:h-2 bg-gray-200 rounded-full relative overflow-hidden cursor-pointer"
              onClick={handleProgressClick}
            >
              <div 
                className="progress h-full bg-[#3C0D99] rounded-full transition-all duration-300 ease-out"
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
            
            {/* Tempo centralizado abaixo da barra */}
            <div className="text-center">
              <span className="text-base sm:text-lg font-bold text-gray-900 tracking-wide">
                {formatTime(currentTime)}
              </span>
            </div>
          </div>
          
          {/* Ícone de Volume conforme mockup - responsivo */}
          <button
            onClick={toggleMute}
            className="volume-button text-gray-700 hover:text-[#3C0D99] transition-colors duration-200 p-1 flex-shrink-0"
          >
            {isMuted ? (
              <VolumeX className="w-6 h-6 sm:w-8 sm:h-8" />
            ) : (
              <Volume2 className="w-6 h-6 sm:w-8 sm:h-8" />
            )}
          </button>
        </div>
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