import { useState, useMemo } from 'react';
import { diffWords, DiffBlock } from '@/utils/diffWords';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Sparkles } from 'lucide-react';

interface Props {
  textoOriginal: string;
  textoLapidado: string;
}

/** Retorna o texto de início e fim de um bloco para verificação de espaçamento */
function blockEndText(block: DiffBlock): string {
  if (block.type === 'equal') return block.text;
  return block.after || block.before || '';
}

function blockStartText(block: DiffBlock): string {
  if (block.type === 'equal') return block.text;
  return block.after || '';
}

export function VersaoLapidadaView({ textoOriginal, textoLapidado }: Props) {
  const [mostrarAlteracoes, setMostrarAlteracoes] = useState(true);

  const { blocks, tooLarge } = useMemo(
    () => diffWords(textoOriginal, textoLapidado),
    [textoOriginal, textoLapidado]
  );

  // Blocos visíveis na versão lapidada (exclui pure-deletions sem after)
  const visibleBlocks = useMemo(
    () => blocks.filter(b => b.type !== 'change' || !!b.after),
    [blocks]
  );

  const temAlteracoes = visibleBlocks.some(b => b.type === 'change');

  // ─── Caso: reescrita total ──────────────────────────────────────────────────
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
      {/* Microcopy pedagógica */}
      <div className="flex items-start gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3">
        <Sparkles className="w-4 h-4 shrink-0 mt-0.5 text-amber-500" />
        <p>
          Os trechos destacados mostram onde seu texto foi aprimorado.
          Clique para visualizar o antes e depois.
        </p>
      </div>

      {/* Botão mostrar/ocultar alterações */}
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

      {/* Texto lapidado com destaques */}
      <div className="text-sm leading-relaxed whitespace-pre-wrap">
        {visibleBlocks.map((block, i) => {
          const prev = visibleBlocks[i - 1];

          // Espaçamento entre blocos: adiciona espaço se o bloco anterior
          // não termina com \n e o bloco atual não começa com \n
          const needsSpace =
            i > 0 &&
            !blockEndText(prev).endsWith('\n') &&
            !blockStartText(block).startsWith('\n');

          const space = needsSpace ? ' ' : '';

          if (block.type === 'equal') {
            return <span key={i}>{space}{block.text}</span>;
          }

          // change block — sempre tem `after` (filtramos pure-deletions acima)
          if (!mostrarAlteracoes) {
            return <span key={i}>{space}{block.after}</span>;
          }

          return (
            <Popover key={i}>
              <PopoverTrigger asChild>
                <span
                  className="bg-amber-100 border-b-2 border-amber-400 text-amber-900 cursor-pointer rounded-sm px-0.5 hover:bg-amber-200 transition-colors"
                >
                  {space}{block.after}
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
          );
        })}
      </div>
    </div>
  );
}
