import { useRef, useEffect, KeyboardEvent } from 'react';
import { Send, Loader2, Mic, MicOff } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useVoiceTranscription } from '@/hooks/useVoiceTranscription';

interface TutorInputProps {
  value:     string;
  onChange:  (value: string) => void;
  onSend:    () => void;
  isLoading: boolean;
  disabled?: boolean;
}

export function TutorInput({ value, onChange, onSend, isLoading, disabled }: TutorInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const { isRecording, isSupported, toggleRecording, stopRecording } =
    useVoiceTranscription(onChange, value, textareaRef);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
  }, [value]);

  const handleKeyDown = (_e: KeyboardEvent<HTMLTextAreaElement>) => {
    // Enter cria nova linha; envio apenas pelo botão
  };

  const handleSend = () => {
    if (!isLoading && !disabled && value.trim()) {
      stopRecording(); // para o ditado antes de enviar
      onSend();
    }
  };

  const canSend = !isLoading && !disabled && !!value.trim();

  return (
    <div className="border-t border-slate-200 bg-white px-5 py-4">
      <div
        className={cn(
          'flex items-end gap-3 rounded-2xl border bg-slate-50 px-4 py-3 shadow-sm transition-all',
          isRecording
            ? 'border-red-300 ring-1 ring-red-200'
            : 'border-slate-200 focus-within:border-purple-400 focus-within:ring-1 focus-within:ring-purple-200'
        )}
      >
        <textarea
          ref={textareaRef}
          value={value}
          onChange={e => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Digite sua dúvida, cole uma frase ou envie um parágrafo para análise..."
          disabled={isLoading || disabled}
          rows={1}
          className={cn(
            'flex-1 resize-none bg-transparent text-sm text-slate-800 placeholder-slate-400',
            'outline-none border-none focus:ring-0 py-0.5 leading-relaxed',
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
            'flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center transition-colors',
            isRecording
              ? 'bg-red-100 text-red-600 animate-pulse hover:bg-red-200'
              : 'bg-white border border-slate-200 text-slate-400 hover:text-slate-600 hover:border-slate-300',
            (!isSupported || isLoading || disabled) && 'opacity-40 cursor-not-allowed',
          )}
        >
          {isRecording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
        </button>

        {/* Botão de enviar */}
        <button
          onClick={handleSend}
          disabled={!canSend}
          className={cn(
            'flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center transition-colors shadow-sm',
            canSend
              ? 'bg-purple-700 text-white hover:bg-purple-800 cursor-pointer'
              : 'bg-slate-200 text-slate-400 cursor-not-allowed'
          )}
        >
          {isLoading
            ? <Loader2 className="w-4 h-4 animate-spin" />
            : <Send className="w-4 h-4" />
          }
        </button>
      </div>

      {isRecording && (
        <p className="text-xs text-red-500 font-medium animate-pulse mt-2 text-center">
          Jarvis está ouvindo…
        </p>
      )}
    </div>
  );
}
