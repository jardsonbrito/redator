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

    // Lista ordenada — scan de dois passos para garantir numeração sequencial
    if (/^\d+\.(\s|$)/.test(line)) {
      const items: string[][] = [];
      let si = i;

      while (si < lines.length && /^\d+\.(\s|$)/.test(lines[si])) {
        // Primeira linha do item (pode ter conteúdo na mesma linha)
        const firstLine = lines[si].replace(/^\d+\.\s*/, '').trim();
        const itemContent: string[] = firstLine ? [firstLine] : [];
        si++;

        // Coleta conteúdo do item até o próximo marcador \d+. ou contexto diferente
        while (si < lines.length && !/^\d+\.(\s|$)/.test(lines[si])) {
          const l = lines[si];
          if (/^#{1,4}\s/.test(l) || /^---+$/.test(l.trim())) break; // heading/separador = fim da lista
          if (l.trim()) itemContent.push(l.trim());
          si++;
        }

        items.push(itemContent);
      }

      i = si; // avança o ponteiro principal para após o bloco inteiro

      elements.push(
        <ul key={`ol-${i}`} className="space-y-3 my-2">
          {items.map((itemLines, idx) => (
            <li key={idx} className="flex gap-2 items-start">
              <span className="flex-shrink-0 font-semibold text-slate-500 min-w-[1.1rem] text-right leading-relaxed">
                {idx + 1}.
              </span>
              <div className="flex-1 space-y-0.5">
                {itemLines.map((cl, j) => (
                  <p key={j} className="leading-relaxed">{renderInline(cl)}</p>
                ))}
              </div>
            </li>
          ))}
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

function removerOrientacaoProfessor(texto: string): string {
  // Remove tudo a partir do separador --- que precede "Orientação ao Professor"
  const idx = texto.search(/-{3,}\s*\n+\*{0,2}Orienta[cç][aã]o ao Professor\*{0,2}/i);
  if (idx !== -1) return texto.slice(0, idx).trim();
  // Fallback: remove direto da linha da seção (sem ---)
  const idx2 = texto.search(/\n\*{0,2}Orienta[cç][aã]o ao Professor\*{0,2}/i);
  if (idx2 !== -1) return texto.slice(0, idx2).trim();
  return texto.trim();
}

export function TutorMessage({ mensagem, isSintese }: TutorMessageProps) {
  const isUser = mensagem.role === 'user';
  const [copied, setCopied] = useState(false);
  const conteudoExibido = isSintese
    ? removerOrientacaoProfessor(mensagem.conteudo)
    : mensagem.conteudo;

  const handleCopy = () => {
    navigator.clipboard.writeText(conteudoExibido).then(() => {
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
        </div>

        <div className="rounded-3xl rounded-tl-sm bg-white border border-slate-200 shadow-sm px-5 py-4 text-sm leading-relaxed text-slate-800">
          <MarkdownContent text={conteudoExibido} />
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
