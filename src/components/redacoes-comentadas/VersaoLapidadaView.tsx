import { useState, useMemo } from 'react';
import { diffWords, DiffBlock } from '@/utils/diffWords';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Sparkles } from 'lucide-react';

interface Props {
  textoOriginal: string;
  textoLapidado: string;
}

/** Retorna o texto de início/fim de um bloco para verificação de espaçamento */
function blockEndText(block: DiffBlock): string {
  if (block.type === 'equal') return block.text;
  return block.after || block.before || '';
}

function blockStartText(block: DiffBlock): string {
  if (block.type === 'equal') return block.text;
  return block.after || '';
}

// ─── Diff palavra-a-palavra dentro de um bloco de cláusula ────────────────────

type WordToken = { type: 'equal' | 'added'; word: string };
type WordGroup = { type: 'equal' | 'added'; text: string };

function inlineWordDiff(before: string, after: string): WordGroup[] {
  const splitWords = (t: string) => t.split(/\s+/).filter(Boolean);
  const aW = splitWords(before);
  const bW = splitWords(after);

  if (aW.length === 0) {
    return bW.length ? [{ type: 'added', text: bW.join(' ') }] : [];
  }

  // LCS palavra-a-palavra
  const m = aW.length;
  const n = bW.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = aW[i - 1] === bW[j - 1]
        ? dp[i - 1][j - 1] + 1
        : Math.max(dp[i - 1][j], dp[i][j - 1]);
    }
  }

  const lcsLen = dp[m][n];
  const similarity = lcsLen / Math.max(m, n);

  // Cláusula muito reestruturada — destaca tudo de uma vez
  if (similarity < 0.65) {
    return [{ type: 'added', text: bW.join(' ') }];
  }

  // Backtrack (versão "after" apenas)
  const tokens: WordToken[] = [];
  let i = m, j = n;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && aW[i - 1] === bW[j - 1]) {
      tokens.push({ type: 'equal', word: aW[i - 1] });
      i--; j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      tokens.push({ type: 'added', word: bW[j - 1] });
      j--;
    } else {
      i--;
    }
  }
  tokens.reverse();

  // Agrupa tokens consecutivos do mesmo tipo
  const groups: WordGroup[] = [];
  for (const t of tokens) {
    const last = groups[groups.length - 1];
    if (last && last.type === t.type) {
      last.text += ' ' + t.word;
    } else {
      groups.push({ type: t.type, text: t.word });
    }
  }
  return groups;
}

/**
 * Dado os grupos palavra-a-palavra de um bloco de alteração,
 * retorna:
 *   - `before`: texto que precede o primeiro grupo added (texto sem marca)
 *   - `anchor`: primeira palavra a ser destacada (âncora do popover)
 *   - `after`: todo o texto que vem depois da âncora (sem marca)
 *
 * Garante exatamente UM destaque por bloco de cláusula.
 */
function extractAnchor(groups: WordGroup[]): {
  before: string;
  anchor: string;
  after: string;
} | null {
  const firstAddedIdx = groups.findIndex(g => g.type === 'added');
  if (firstAddedIdx === -1) return null;

  const beforeGroups = groups.slice(0, firstAddedIdx);
  const firstAdded = groups[firstAddedIdx];
  const restGroups = groups.slice(firstAddedIdx + 1);

  const beforeText = beforeGroups.map(g => g.text).join(' ');

  // Âncora = primeira palavra do primeiro grupo alterado
  const addedWords = firstAdded.text.split(' ');
  const anchor = addedWords[0];

  // Tudo após a âncora: resto do grupo added + todos os grupos seguintes
  const afterParts = [
    ...addedWords.slice(1),
    ...restGroups.map(g => g.text),
  ].filter(Boolean);
  const afterText = afterParts.join(' ');

  return { before: beforeText, anchor, after: afterText };
}

// ─── Componente principal ────────────────────────────────────────────────────

export function VersaoLapidadaView({ textoOriginal, textoLapidado }: Props) {
  const [mostrarAlteracoes, setMostrarAlteracoes] = useState(true);

  const { blocks, tooLarge } = useMemo(
    () => diffWords(textoOriginal, textoLapidado),
    [textoOriginal, textoLapidado]
  );

  const visibleBlocks = useMemo(
    () => blocks.filter(b => b.type !== 'change' || !!b.after),
    [blocks]
  );

  const temAlteracoes = visibleBlocks.some(b => b.type === 'change');

  // ─── Reescrita total ────────────────────────────────────────────────────────
  if (tooLarge) {
    return (
      <div className="space-y-3">
        <div className="flex items-start gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3">
          <Sparkles className="w-4 h-4 shrink-0 mt-0.5 text-amber-500" />
          <p>
            Esta versão representa uma reformulação ampla do texto original.
            Leia com atenção e compare com sua redação para identificar as melhorias.
          </p>
        </div>
        <div className="text-sm leading-relaxed whitespace-pre-wrap">
          {textoLapidado}
        </div>
      </div>
    );
  }

  // ─── Renderização com highlights ────────────────────────────────────────────
  return (
    <div className="space-y-3">
      <div className="flex items-start gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3">
        <Sparkles className="w-4 h-4 shrink-0 mt-0.5 text-amber-500" />
        <p>
          As palavras destacadas marcam o início de cada trecho aprimorado.
          Clique para visualizar o antes e depois.
        </p>
      </div>

      {temAlteracoes && (
        <div className="flex justify-end">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="text-xs h-7 gap-1.5 border-amber-300 text-amber-700 hover:bg-amber-50"
            onClick={() => setMostrarAlteracoes(v => !v)}
          >
            {mostrarAlteracoes ? 'Ocultar alterações' : 'Mostrar alterações'}
          </Button>
        </div>
      )}

      <div className="text-sm leading-relaxed whitespace-pre-wrap">
        {visibleBlocks.map((block, i) => {
          const prev = visibleBlocks[i - 1];
          const needsSpace =
            i > 0 &&
            !blockEndText(prev).endsWith('\n') &&
            !blockStartText(block).startsWith('\n');
          const space = needsSpace ? ' ' : '';

          if (block.type === 'equal') {
            return <span key={i}>{space}{block.text}</span>;
          }

          if (!mostrarAlteracoes) {
            return <span key={i}>{space}{block.after}</span>;
          }

          // Extrai âncora — exatamente 1 destaque por bloco de cláusula
          const wordGroups = inlineWordDiff(block.before || '', block.after!);
          const anchored = extractAnchor(wordGroups);

          if (!anchored) {
            // Nenhuma palavra adicionada visível (só remoções) — renderiza limpo
            return <span key={i}>{space}{block.after}</span>;
          }

          const { before: bfr, anchor, after: aft } = anchored;

          return (
            <span key={i}>
              {space}
              {bfr && <span>{bfr} </span>}
              <Popover>
                <PopoverTrigger asChild>
                  <span className="bg-amber-100 border-b-2 border-amber-400 text-amber-900 cursor-pointer rounded-sm px-0.5 hover:bg-amber-200 transition-colors">
                    {anchor}
                  </span>
                </PopoverTrigger>
                <PopoverContent className="w-80 p-3 space-y-2" sideOffset={6}>
                  {block.before ? (
                    <div>
                      <p className="text-xs font-semibold text-red-600 mb-1">Antes</p>
                      <div className="bg-red-50 border border-red-200 rounded p-2 text-xs text-red-800 leading-relaxed whitespace-pre-wrap">
                        {block.before}
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground italic">Trecho adicionado na versão lapidada.</p>
                  )}
                  <div>
                    <p className="text-xs font-semibold text-green-600 mb-1">Depois</p>
                    <div className="bg-green-50 border border-green-200 rounded p-2 text-xs text-green-800 leading-relaxed whitespace-pre-wrap">
                      {block.after}
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
              {aft && <span> {aft}</span>}
            </span>
          );
        })}
      </div>
    </div>
  );
}
