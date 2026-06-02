import { useState } from 'react';
import { JarvisIcon } from '@/components/icons/JarvisIcon';
import { User, Copy, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { TutorMensagem } from '@/hooks/useTutorChat';

// ── Renderizador de markdown leve ──────────────────────────────────

function renderInline(text: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
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
  const lines    = text.split('\n');
  const elements: React.ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (line.trim() === '') { i++; continue; }

    // Lista não-ordenada
    if (/^(\s*[-•]\s)/.test(line) && !line.startsWith('**')) {
      const listItems: React.ReactNode[] = [];
      while (i < lines.length && /^(\s*[-•]\s)/.test(lines[i]) && !lines[i].startsWith('**')) {
        const content = lines[i].replace(/^\s*[-•]\s/, '');
        listItems.push(<li key={i} className="ml-1">{renderInline(content)}</li>);
        i++;
      }
      elements.push(
        <ul key={`ul-${i}`} className="list-disc list-inside space-y-0.5 my-1.5">
          {listItems}
        </ul>
      );
      continue;
    }

    // Lista ordenada (suporta itens de uma linha e multi-linha com linhas em branco internas)
    if (/^\d+\.(\s|$)/.test(line)) {
      const listItems: React.ReactNode[] = [];
      let itemNum = 1;

      // Avança linhas em branco entre itens
      const skipBlanks = () => {
        while (i < lines.length && lines[i].trim() === '') i++;
      };

      while (i < lines.length && /^\d+\.(\s|$)/.test(lines[i])) {
        const firstContent = lines[i].replace(/^\d+\.\s*/, '').trim();
        i++;

        const contentLines: string[] = [];
        if (firstContent) contentLines.push(firstContent);

        // Coleta linhas até encontrar o próximo \d+. ou fim do bloco
        while (i < lines.length) {
          const cur = lines[i];

          // Para em estruturas que não são continuação de item
          if (/^\d+\.(\s|$)/.test(cur)) break;
          if (/^(\s*[-•]\s)/.test(cur)) break;
          if (/^#{1,4}\s/.test(cur)) break;

          if (cur.trim() === '') {
            // Linha em branco: espia o que vem depois
            let j = i + 1;
            while (j < lines.length && lines[j].trim() === '') j++;

            if (j >= lines.length || /^\d+\.(\s|$)/.test(lines[j])) {
              // Fim do item: avança i até o próximo \d+. (para o outer while continuar)
              i = j;
              break;
            }
            // Conteúdo não-numerado vem depois: linha em branco é interna ao item
            i++;
            continue;
          }

          contentLines.push(cur.trim());
          i++;
        }

        listItems.push(
          <li key={itemNum} className="flex gap-2 items-start">
            <span className="flex-shrink-0 font-semibold text-slate-500 min-w-[1.1rem] text-right leading-relaxed">{itemNum}.</span>
            <div className="flex-1 space-y-0.5">
              {contentLines.map((cl, j) => (
                <p key={j} className="leading-relaxed">{renderInline(cl)}</p>
              ))}
            </div>
          </li>
        );
        itemNum++;
        skipBlanks(); // pula linhas em branco entre itens antes do próximo \d+.
      }

      elements.push(
        <ul key={`ol-${i}`} className="space-y-3 my-2">
          {listItems}
        </ul>
      );
      continue;
    }

    elements.push(
      <p key={i} className="mb-1.5 last:mb-0">
        {renderInline(line)}
      </p>
    );
    i++;
  }

  return <div className="space-y-0.5">{elements}</div>;
}

// ── Componente de mensagem ─────────────────────────────────────────

interface TutorMessageProps {
  mensagem:   TutorMensagem;
  isSintese?: boolean;
}

export function TutorMessage({ mensagem, isSintese }: TutorMessageProps) {
  const isUser = mensagem.role === 'user';
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(mensagem.conteudo).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  if (isUser) {
    return (
      <div className="flex items-end gap-3 px-6 py-2 justify-end">
        <div className="max-w-[78%] rounded-3xl rounded-tr-sm bg-purple-700 text-white px-5 py-3.5 text-sm leading-relaxed shadow-sm">
          <p className="whitespace-pre-wrap break-words">{mensagem.conteudo}</p>
        </div>
        <div className="w-8 h-8 flex-shrink-0 rounded-full bg-slate-200 flex items-center justify-center mb-1">
          <User className="w-4 h-4 text-slate-500" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-3 px-6 py-2 group">
      <div className="w-9 h-9 flex-shrink-0 rounded-2xl bg-purple-100 flex items-center justify-center mt-1">
        <div className="w-5 h-5">
          <JarvisIcon />
        </div>
      </div>

      <div className="flex flex-col gap-1 max-w-[86%]">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-semibold text-slate-700">Tutor Jarvis</span>
          <span className="text-[10px] text-slate-400">análise pedagógica</span>
        </div>

        <div className="rounded-3xl rounded-tl-sm bg-white border border-slate-200 shadow-sm px-5 py-4 text-sm leading-relaxed text-slate-800">
          <MarkdownContent text={mensagem.conteudo} />
        </div>

        {/* Botão copiar — sempre visível na síntese, hover nos demais */}
        <button
          onClick={handleCopy}
          className={cn(
            'self-start flex items-center gap-1 transition-colors px-2 py-1 mt-1 rounded-lg',
            isSintese
              ? 'text-xs font-medium text-purple-700 bg-purple-50 border border-purple-200 hover:bg-purple-100'
              : 'text-[10px] text-slate-400 hover:text-slate-600 opacity-0 group-hover:opacity-100 px-1',
          )}
          title="Copiar relatório"
        >
          {copied
            ? <><Check className={cn('w-3 h-3', isSintese ? 'text-green-600' : 'text-green-500')} /> {isSintese ? 'Copiado!' : 'Copiado'}</>
            : <><Copy className="w-3 h-3" /> {isSintese ? 'Copiar relatório' : 'Copiar'}</>
          }
        </button>
      </div>
    </div>
  );
}

export function TutorThinkingIndicator() {
  return (
    <div className="flex items-start gap-3 px-6 py-2">
      <div className="w-9 h-9 flex-shrink-0 rounded-2xl bg-purple-100 flex items-center justify-center">
        <div className="w-5 h-5">
          <JarvisIcon />
        </div>
      </div>
      <div className="mt-1">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-semibold text-slate-700">Tutor Jarvis</span>
        </div>
        <div className="bg-white border border-slate-200 rounded-3xl rounded-tl-sm px-5 py-3.5 shadow-sm">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 bg-purple-400 rounded-full animate-bounce [animation-delay:0ms]" />
            <span className="w-2 h-2 bg-purple-400 rounded-full animate-bounce [animation-delay:150ms]" />
            <span className="w-2 h-2 bg-purple-400 rounded-full animate-bounce [animation-delay:300ms]" />
          </div>
        </div>
      </div>
    </div>
  );
}
