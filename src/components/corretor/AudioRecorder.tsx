import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Mic, Square, Play, Pause, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

type TabelaTipo = 'redacoes_enviadas' | 'redacoes_simulado' | 'redacoes_exercicio';

interface AudioRecorderProps {
  redacaoId: string;
  tabela: TabelaTipo;
  disabled?: boolean;
  onAudioSaved?: (audioUrl: string) => void;
  onAudioDeleted?: () => void;
  existingAudioUrl?: string | null;
}

export const AudioRecorder = ({
  redacaoId,
  tabela,
  disabled = false,
  onAudioSaved,
  onAudioDeleted,
  existingAudioUrl
}: AudioRecorderProps) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(existingAudioUrl);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackTime, setPlaybackTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [uploading, setUploading] = useState(false);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  
  const { toast } = useToast();

  useEffect(() => {
    setAudioUrl(existingAudioUrl);
  }, [existingAudioUrl]);

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, []);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100
        } 
      });
      
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });
      
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };
      
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        setAudioBlob(blob);
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
        
        // Cleanup stream
        stream.getTracks().forEach(track => track.stop());
      };
      
      mediaRecorder.start(1000); // Collect data every second
      setIsRecording(true);
      setRecordingTime(0);
      
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => {
          if (prev >= 180) { // 3 minutes limit
            stopRecording();
            return prev;
          }
          return prev + 1;
        });
      }, 1000);
      
    } catch (error) {
      console.error('Erro ao acessar microfone:', error);
      toast({
        title: "Erro de permissão",
        description: "Não foi possível acessar o microfone. Verifique as permissões do navegador.",
        variant: "destructive"
      });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  };

  const uploadAudio = async () => {
    if (!audioBlob) {
      toast({
        title: "Erro",
        description: "Nenhum áudio para salvar.",
        variant: "destructive"
      });
      return;
    }

    setUploading(true);
    
    try {
      const timestamp = Date.now();
      const fileName = `${redacaoId}/${timestamp}.webm`;
      
      // Upload to Supabase Storage
      const { data, error: uploadError } = await supabase.storage
        .from('audios-corretores')
        .upload(fileName, audioBlob, {
          contentType: 'audio/webm',
          upsert: true
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('audios-corretores')
        .getPublicUrl(fileName);

      // Update database with audio URL based on table type
      let dbError;
      if (tabela === 'redacoes_enviadas') {
        const { error } = await supabase
          .from('redacoes_enviadas')
          .update({ audio_url: publicUrl })
          .eq('id', redacaoId);
        dbError = error;
      } else if (tabela === 'redacoes_simulado') {
        const { error } = await supabase
          .from('redacoes_simulado')
          .update({ audio_url: publicUrl })
          .eq('id', redacaoId);
        dbError = error;
      } else if (tabela === 'redacoes_exercicio') {
        const { error } = await supabase
          .from('redacoes_exercicio')
          .update({ audio_url: publicUrl })
          .eq('id', redacaoId);
        dbError = error;
      }

      if (dbError) throw dbError;

      toast({
        title: "Áudio salvo!",
        description: "O áudio foi salvo com sucesso.",
      });

      onAudioSaved?.(publicUrl);
      
    } catch (error: any) {
      console.error('Erro ao salvar áudio:', error);
      toast({
        title: "Erro ao salvar áudio",
        description: error.message || "Ocorreu um erro inesperado.",
        variant: "destructive"
      });
    } finally {
      setUploading(false);
    }
  };

  const deleteAudio = async () => {
    setUploading(true);
    
    try {
      // Extract file path from URL
      if (audioUrl && audioUrl.includes('audios-corretores/')) {
        const filePath = audioUrl.split('audios-corretores/')[1];
        
        // Delete from storage
        await supabase.storage
          .from('audios-corretores')
          .remove([filePath]);
      }

      // Update database based on table type
      let dbError;
      if (tabela === 'redacoes_enviadas') {
        const { error } = await supabase
          .from('redacoes_enviadas')
          .update({ audio_url: null })
          .eq('id', redacaoId);
        dbError = error;
      } else if (tabela === 'redacoes_simulado') {
        const { error } = await supabase
          .from('redacoes_simulado')
          .update({ audio_url: null })
          .eq('id', redacaoId);
        dbError = error;
      } else if (tabela === 'redacoes_exercicio') {
        const { error } = await supabase
          .from('redacoes_exercicio')
          .update({ audio_url: null })
          .eq('id', redacaoId);
        dbError = error;
      }

      if (dbError) throw dbError;

      setAudioUrl(null);
      setAudioBlob(null);
      setPlaybackTime(0);
      setDuration(0);
      
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }

      toast({
        title: "Áudio excluído",
        description: "O áudio foi removido com sucesso.",
      });

      onAudioDeleted?.();
      
    } catch (error: any) {
      console.error('Erro ao excluir áudio:', error);
      toast({
        title: "Erro ao excluir áudio",
        description: error.message || "Ocorreu um erro inesperado.",
        variant: "destructive"
      });
    } finally {
      setUploading(false);
    }
  };

  const togglePlayback = () => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  const handleAudioLoad = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setPlaybackTime(audioRef.current.currentTime);
    }
  };

  const handleAudioEnd = () => {
    setIsPlaying(false);
    setPlaybackTime(0);
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
    }
  };

  // Recording state
  if (isRecording) {
    return (
      <div className="flex items-center gap-4 p-4 bg-red-50 border border-red-200 rounded-lg">
        <div className="flex items-center gap-2 text-red-600">
          <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
          <span className="font-medium">Gravando...</span>
        </div>
        <span className="text-red-600 font-mono">
          {formatTime(recordingTime)}
        </span>
        <Button
          onClick={stopRecording}
          size="sm"
          variant="destructive"
          className="rounded-full w-8 h-8 p-0"
          aria-label="Parar gravação"
        >
          <Square className="w-4 h-4" />
        </Button>
        {recordingTime >= 180 && (
          <span className="text-red-600 text-sm">Limite de 3 minutos atingido</span>
        )}
      </div>
    );
  }

  // Playback state (has audio)
  if (audioUrl) {
    return (
      <div className="flex items-center gap-4 p-4 bg-gray-50 border rounded-lg">
        <audio
          ref={audioRef}
          src={audioUrl}
          onLoadedMetadata={handleAudioLoad}
          onTimeUpdate={handleTimeUpdate}
          onEnded={handleAudioEnd}
          preload="metadata"
        />
        
        <Button
          onClick={togglePlayback}
          size="sm"
          variant="outline"
          className="rounded-full w-8 h-8 p-0"
          disabled={disabled || uploading}
          aria-label={isPlaying ? "Pausar áudio" : "Reproduzir áudio"}
        >
          {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
        </Button>
        
        <div className="flex-1 flex items-center gap-2">
          <div className="flex-1 bg-gray-200 rounded-full h-2">
            <div 
              className="bg-primary h-2 rounded-full transition-all"
              style={{ width: `${duration > 0 ? (playbackTime / duration) * 100 : 0}%` }}
            />
          </div>
          <span className="text-sm text-gray-600 font-mono min-w-[50px]">
            {formatTime(isPlaying ? playbackTime : duration)}
          </span>
        </div>

        {audioBlob && !disabled && (
          <Button
            onClick={uploadAudio}
            size="sm"
            disabled={uploading}
            className="text-xs"
          >
            {uploading ? "Salvando..." : "Salvar"}
          </Button>
        )}
        
        {!disabled && (
          <Button
            onClick={deleteAudio}
            size="sm"
            variant="destructive"
            className="rounded-full w-8 h-8 p-0"
            disabled={uploading}
            aria-label="Excluir gravação"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        )}
      </div>
    );
  }

  // Initial state (no audio)
  return (
    <Button
      onClick={startRecording}
      size="sm"
      variant="outline"
      className={cn(
        "rounded-full w-10 h-10 p-0 hover:bg-red-50 hover:border-red-300",
        disabled && "opacity-50 cursor-not-allowed"
      )}
      disabled={disabled}
      aria-label="Iniciar gravação"
    >
      <Mic className="w-5 h-5 text-red-500" />
    </Button>
  );
};