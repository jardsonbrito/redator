import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { useComentariosTrechoCorrecao, ComentarioTrecho } from '@/hooks/useComentariosTrechoCorrecao';

const COMP_COLORS: Record<string, { hl: string; badge: string; dialog: string; label: string }> = {
  c1: { hl: 'bg-red-200 text-red-900 border-b-2 border-red-400', badge: 'bg-red-100 text-red-700 border-red-200', dialog: 'bg-red-100 text-red-900 border border-red-300', label: 'Competência 1' },
  c2: { hl: 'bg-emerald-200 text-emerald-900 border-b-2 border-emerald-400', badge: 'bg-emerald-100 text-emerald-700 border-emerald-200', dialog: 'bg-emerald-100 text-emerald-900 border border-emerald-300', label: 'Competência 2' },
  c3: { hl: 'bg-blue-200 text-blue-900 border-b-2 border-blue-400', badge: 'bg-blue-100 text-blue-700 border-blue-200', dialog: 'bg-blue-100 text-blue-900 border border-blue-300', label: 'Competência 3' },
  c4: { hl: 'bg-orange-200 text-orange-900 border-b-2 border-orange-400', badge: 'bg-orange-100 text-orange-700 border-orange-200', dialog: 'bg-orange-100 text-orange-900 border border-orange-300', label: 'Competência 4' },
  c5: { hl: 'bg-purple-200 text-purple-900 border-b-2 border-purple-400', badge: 'bg-purple-100 text-purple-700 border-purple-200', dialog: 'bg-purple-100 text-purple-900 border border-purple-300', label: 'Competência 5' },
};

const TIPO_LABELS: Record<string, string> = {
  erro: 'Erro',
  dica: 'Dica',
  ponto_de_atencao: 'Ponto de atenção',
};

function buildSegments(texto: string, marcacoes: ComentarioTrecho[]) {
  if (!marcacoes.length) return [{ texto, isHighlight: false, marcacao: undefined as ComentarioTrecho | undefined }];
  const sorted = [...marcacoes].sort((a, b) => a.inicio - b.inicio);
  const segments: Array<{ texto: string; isHighlight: boolean; marcacao?: ComentarioTrecho }> = [];
  let cursor = 0;
  for (const m of sorted) {
    if (m.inicio > cursor) segments.push({ texto: texto.slice(cursor, m.inicio), isHighlight: false });
    if (m.fim > m.inicio) segments.push({ texto: texto.slice(m.inicio, m.fim), isHighlight: true, marcacao: m });
    cursor = Math.max(cursor, m.fim);
  }
  if (cursor < texto.length) segments.push({ texto: texto.slice(cursor), isHighlight: false });
  return segments;
}

interface TextoRedacaoComMarcacoesProps {
  redacaoId: string;
  texto: string;
  className?: string;
}

export const TextoRedacaoComMarcacoes = ({ redacaoId, texto, className = '' }: TextoRedacaoComMarcacoesProps) => {
  const { confirmadas, isLoading } = useComentariosTrechoCorrecao(redacaoId);
  const [anotacaoAberta, setAnotacaoAberta] = useState<ComentarioTrecho | null>(null);

  const validas = confirmadas.filter(
    m => m.inicio >= 0 && m.fim <= texto.length && m.fim > m.inicio
  );

  if (isLoading || validas.length === 0) {
    return <p className={`whitespace-pre-wrap leading-relaxed ${className}`}>{texto}</p>;
  }

  const segments = buildSegments(texto, validas);

  return (
    <>
      <p className={`whitespace-pre-wrap leading-relaxed ${className}`}>
        {segments.map((seg, idx) =>
          seg.isHighlight && seg.marcacao ? (
            <span
              key={idx}
              className={`cursor-pointer rounded-sm px-0.5 transition-colors hover:opacity-80 ${COMP_COLORS[seg.marcacao.competencia]?.hl ?? 'bg-yellow-200 text-yellow-900 border-b-2 border-yellow-400'}`}
              onClick={() => setAnotacaoAberta(seg.marcacao!)}
              title="Clique para ver o comentário do corretor"
            >
              {seg.texto}
            </span>
          ) : (
            <span key={idx}>{seg.texto}</span>
          )
        )}
      </p>

      {/* Legenda */}
      <div className="flex items-center gap-3 flex-wrap mt-2 pt-2 border-t border-slate-100">
        <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wide">Marcações do corretor:</span>
        {['c1','c2','c3','c4','c5'].map((c, i) => {
          const hasC = validas.some(m => m.competencia === c);
          if (!hasC) return null;
          return (
            <div key={c} className="flex items-center gap-1">
              <span className={`inline-block w-4 h-2 rounded-sm border-b-2 ${COMP_COLORS[c].hl}`} />
              <span className="text-[10px] text-slate-500">C{i + 1}</span>
            </div>
          );
        })}
        <span className="text-[10px] text-slate-400 italic">Clique em um trecho destacado para ver o comentário</span>
      </div>

      <Dialog open={!!anotacaoAberta} onOpenChange={(open) => !open && setAnotacaoAberta(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base flex items-center gap-2 flex-wrap">
              {anotacaoAberta && COMP_COLORS[anotacaoAberta.competencia] && (
                <span className={`text-xs px-2 py-0.5 rounded-full font-semibold border ${COMP_COLORS[anotacaoAberta.competencia].badge}`}>
                  {COMP_COLORS[anotacaoAberta.competencia].label}
                </span>
              )}
              {anotacaoAberta?.tipo && (
                <Badge variant="outline" className="text-xs">
                  {TIPO_LABELS[anotacaoAberta.tipo] ?? anotacaoAberta.tipo}
                </Badge>
              )}
            </DialogTitle>
          </DialogHeader>
          {anotacaoAberta && (
            <div className="space-y-3">
              <div className={`rounded p-3 text-sm italic ${COMP_COLORS[anotacaoAberta.competencia]?.dialog ?? 'bg-muted/50'}`}>
                "{anotacaoAberta.trecho}"
              </div>
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Comentário do corretor</p>
                <div className="bg-muted/50 rounded p-3 text-sm leading-relaxed text-foreground whitespace-pre-wrap">
                  {anotacaoAberta.comentario}
                </div>
              </div>
              {anotacaoAberta.sugestao_reescrita && (
                <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-3">
                  <p className="text-xs font-semibold text-emerald-700 uppercase tracking-wide mb-1">Sugestão de reescrita</p>
                  <p className="text-sm italic text-emerald-800">"{anotacaoAberta.sugestao_reescrita}"</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};
