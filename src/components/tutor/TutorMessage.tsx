import { JarvisIcon } from '@/components/icons/JarvisIcon';
import { User } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { TutorMensagem } from '@/hooks/useTutorChat';

interface TutorMessageProps {
  mensagem: TutorMensagem;
}

export function TutorMessage({ mensagem }: TutorMessageProps) {
  const isUser = mensagem.role === 'user';

  return (
    <div className={cn('flex gap-3 px-4 py-2', isUser ? 'justify-end' : 'justify-start')}>
      {/* Avatar Jarvis */}
      {!isUser && (
        <div className="w-8 h-8 flex-shrink-0 rounded-full bg-indigo-100 flex items-center justify-center mt-1">
          <div className="w-5 h-5">
            <JarvisIcon />
          </div>
        </div>
      )}

      {/* Bolha da mensagem */}
      <div
        className={cn(
          'max-w-[75%] rounded-2xl px-4 py-3 text-sm leading-relaxed',
          isUser
            ? 'bg-indigo-600 text-white rounded-tr-sm'
            : 'bg-white border border-gray-200 text-gray-800 rounded-tl-sm shadow-sm'
        )}
      >
        {/* Conteúdo com quebras de linha preservadas */}
        <p className="whitespace-pre-wrap break-words">{mensagem.conteudo}</p>
      </div>

      {/* Avatar usuário */}
      {isUser && (
        <div className="w-8 h-8 flex-shrink-0 rounded-full bg-gray-200 flex items-center justify-center mt-1">
          <User className="w-4 h-4 text-gray-500" />
        </div>
      )}
    </div>
  );
}

export function TutorThinkingIndicator() {
  return (
    <div className="flex gap-3 px-4 py-2 justify-start">
      <div className="w-8 h-8 flex-shrink-0 rounded-full bg-indigo-100 flex items-center justify-center">
        <div className="w-5 h-5">
          <JarvisIcon />
        </div>
      </div>
      <div className="bg-white border border-gray-200 rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce [animation-delay:0ms]" />
          <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce [animation-delay:150ms]" />
          <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce [animation-delay:300ms]" />
        </div>
      </div>
    </div>
  );
}
