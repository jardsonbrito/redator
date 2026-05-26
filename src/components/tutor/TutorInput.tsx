import { useRef, useEffect, KeyboardEvent } from 'react';
import { Send, Loader2, Mic, MicOff } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useVoiceTranscription } from '@/hooks/useVoiceTranscription';

interface TutorInputProps {
  value:       string;
  onChange:    (value: string) => void;
  onSend:      () => void;
  isLoading:   boolean;
  disabled?:   boolean;
}

export function TutorInput({ value, onChange, onSend, isLoading, disabled }: TutorInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const { isRecording, isSupported, toggleRecording } =
    useVoiceTranscription(onChange, value, textareaRef);

  // Auto-resize do textarea conforme o conteúdo cresce
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
  }, [value]);

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!isLoading && !disabled && value.trim()) onSend();
    }
  };

  const canSend = !isLoading && !disabled && !!value.trim();

  return (
    <div className="border-t border-gray-200 bg-white px-4 py-3">
      <div className="flex items-end gap-2 rounded-2xl border border-gray-300 bg-gray-50 px-3 py-2 focus-within:border-indigo-400 focus-within:ring-1 focus-within:ring-indigo-200 transition-all">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={e => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Digite sua dúvida, texto ou frase para análise…"
          disabled={isLoading || disabled}
          rows={1}
          className={cn(
            'flex-1 resize-none bg-transparent text-sm text-gray-800 placeholder-gray-400',
            'outline-none border-none focus:ring-0 py-1',
            'disabled:opacity-60 max-h-[200px] overflow-y-auto',
          )}
        />

        {/* Botão de voz */}
        <button
          type="button"
          onClick={toggleRecording}
          disabled={!isSupported || isLoading || disabled}
          title={
            !isSupported
              ? 'Seu navegador não suporta reconhecimento de voz'
              : isRecording
              ? 'Parar gravação'
              : 'Ditar texto por voz'
          }
          className={cn(
            'flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-colors mb-0.5',
            isRecording
              ? 'bg-red-100 text-red-600 animate-pulse hover:bg-red-200'
              : 'bg-gray-100 text-gray-400 hover:bg-gray-200 hover:text-gray-600',
            (!isSupported || isLoading || disabled) && 'opacity-40 cursor-not-allowed',
          )}
        >
          {isRecording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
        </button>

        {/* Botão de enviar */}
        <button
          onClick={onSend}
          disabled={!canSend}
          className={cn(
            'flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-colors mb-0.5',
            canSend
              ? 'bg-indigo-600 text-white hover:bg-indigo-700 cursor-pointer'
              : 'bg-gray-200 text-gray-400 cursor-not-allowed'
          )}
        >
          {isLoading
            ? <Loader2 className="w-4 h-4 animate-spin" />
            : <Send className="w-4 h-4" />
          }
        </button>
      </div>

      {isRecording && (
        <p className="text-xs text-red-500 font-medium animate-pulse mt-1.5 text-center">
          Jarvis está ouvindo…
        </p>
      )}
      {!isRecording && (
        <p className="text-[10px] text-gray-400 mt-1.5 text-center">
          Enter para enviar · Shift+Enter para nova linha
        </p>
      )}
    </div>
  );
}
