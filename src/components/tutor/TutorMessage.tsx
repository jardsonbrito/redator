import { useState } from 'react';
import { JarvisIcon } from '@/components/icons/JarvisIcon';
import { User, Copy, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { TutorMensagem } from '@/hooks/useTutorChat';

// ── Renderizador de markdown leve ──────────────────────────────────
// Suporta: **bold**, *italic*, listas com -, listas numeradas, parágrafos

function renderInline(text: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  // Regex: bold (**...**) ou italic (*...*)
  const regex = /(\*\*(.+?)\*\*|\*(.+?)\*)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    if (match[0].startsWith('**')) {
      parts.push(<strong key={match.index} className="font-semibold">{match[2]}</strong>);
    } else {
      parts.push(<em key={match.index}>{match[3]}</em>);
    }
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < text.length) parts.push(text.slice(lastIndex));
  return parts;
}

function MarkdownContent({ text }: { text: string }) {
  const lines = text.split('\n');
  const elements: React.ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Linha vazia → espaçamento entre blocos
    if (line.trim() === '') {
      i++;
      continue;
    }

    // Lista não-ordenada: começa com "- " ou "* " (sem ser bold)
    if (/^(\s*[-•]\s)/.test(line) && !line.startsWith('**')) {
      const listItems: React.ReactNode[] = [];
      while (i < lines.length && /^(\s*[-•]\s)/.test(lines[i]) && !lines[i].startsWith('**')) {
        const content = lines[i].replace(/^\s*[-•]\s/, '');
        listItems.push(
          <li key={i} className="ml-1">
            {renderInline(content)}
          </li>
        );
        i++;
      }
      elements.push(
        <ul key={`ul-${i}`} className="list-disc list-inside space-y-0.5 my-1">
          {listItems}
        </ul>
      );
      continue;
    }

    // Lista ordenada: começa com "1. ", "2. " etc.
    if (/^\d+\.\s/.test(line)) {
      const listItems: React.ReactNode[] = [];
      let counter = 0;
      while (i < lines.length && /^\d+\.\s/.test(lines[i])) {
        const content = lines[i].replace(/^\d+\.\s/, '');
        listItems.push(
          <li key={i} className="ml-1">
            {renderInline(content)}
          </li>
        );
        i++;
        counter++;
      }
      elements.push(
        <ol key={`ol-${i}`} className="list-decimal list-inside space-y-0.5 my-1">
          {listItems}
        </ol>
      );
      continue;
    }

    // Parágrafo normal
    elements.push(
      <p key={i} className="mb-1 last:mb-0">
        {renderInline(line)}
      </p>
    );
    i++;
  }

  return <div className="space-y-1">{elements}</div>;
}

// ── Componente de mensagem ─────────────────────────────────────────

interface TutorMessageProps {
  mensagem: TutorMensagem;
}

export function TutorMessage({ mensagem }: TutorMessageProps) {
  const isUser  = mensagem.role === 'user';
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(mensagem.conteudo).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className={cn('flex gap-3 px-4 py-2 group', isUser ? 'justify-end' : 'justify-start')}>
      {/* Avatar Jarvis */}
      {!isUser && (
        <div className="w-8 h-8 flex-shrink-0 rounded-full bg-indigo-100 flex items-center justify-center mt-1">
          <div className="w-5 h-5">
            <JarvisIcon />
          </div>
        </div>
      )}

      {/* Bolha + botão copiar */}
      <div className="flex flex-col gap-1 max-w-[75%]">
        <div
          className={cn(
            'rounded-2xl px-4 py-3 text-sm leading-relaxed',
            isUser
              ? 'bg-indigo-600 text-white rounded-tr-sm'
              : 'bg-white border border-gray-200 text-gray-800 rounded-tl-sm shadow-sm'
          )}
        >
          {isUser
            ? <p className="whitespace-pre-wrap break-words">{mensagem.conteudo}</p>
            : <MarkdownContent text={mensagem.conteudo} />
          }
        </div>

        {/* Botão copiar — visível no hover da mensagem do assistente */}
        {!isUser && (
          <button
            onClick={handleCopy}
            className={cn(
              'self-start flex items-center gap-1 text-[10px] text-gray-400 hover:text-gray-600 transition-colors px-1',
              'opacity-0 group-hover:opacity-100',
            )}
            title="Copiar resposta"
          >
            {copied
              ? <><Check className="w-3 h-3 text-green-500" /> Copiado</>
              : <><Copy className="w-3 h-3" /> Copiar</>
            }
          </button>
        )}
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
