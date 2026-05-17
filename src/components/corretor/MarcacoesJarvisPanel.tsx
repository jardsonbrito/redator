import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, Check, X, Edit2, Undo2, ChevronDown, ChevronUp } from "lucide-react";
import { TextareaWithSpellcheck } from "@/components/ui/textarea-with-spellcheck";
import { useComentariosTrechoCorrecao, ComentarioTrecho } from "@/hooks/useComentariosTrechoCorrecao";

const COMP_COLORS: Record<string, { bg: string; text: string; border: string; label: string }> = {
  c1: { bg: 'bg-red-100', text: 'text-red-800', border: 'border-red-300', label: 'C1' },
  c2: { bg: 'bg-emerald-100', text: 'text-emerald-800', border: 'border-emerald-300', label: 'C2' },
  c3: { bg: 'bg-blue-100', text: 'text-blue-800', border: 'border-blue-300', label: 'C3' },
  c4: { bg: 'bg-orange-100', text: 'text-orange-800', border: 'border-orange-300', label: 'C4' },
  c5: { bg: 'bg-purple-100', text: 'text-purple-800', border: 'border-purple-300', label: 'C5' },
};

const TIPO_LABELS: Record<string, string> = {
  erro: 'Erro',
  dica: 'Dica',
  ponto_de_atencao: 'Atenção',
};

interface Segmento {
  texto: string;
  isHighlight: boolean;
  marcacao?: ComentarioTrecho;
}

function buildSegments(texto: string, marcacoes: ComentarioTrecho[]): Segmento[] {
  if (!marcacoes.length) return [{ texto, isHighlight: false }];
  const sorted = [...marcacoes].sort((a, b) => a.inicio - b.inicio);
  const segments: Segmento[] = [];
  let cursor = 0;
  for (const m of sorted) {
    if (m.inicio > cursor) segments.push({ texto: texto.slice(cursor, m.inicio), isHighlight: false });
    if (m.fim > m.inicio) segments.push({ texto: texto.slice(m.inicio, m.fim), isHighlight: true, marcacao: m });
    cursor = Math.max(cursor, m.fim);
  }
  if (cursor < texto.length) segments.push({ texto: texto.slice(cursor), isHighlight: false });
  return segments;
}

function highlightClass(m: ComentarioTrecho): string {
  if (m.status === 'sugerida') {
    return 'bg-violet-100 text-violet-900 border-b-2 border-dashed border-violet-400 cursor-pointer hover:bg-violet-200';
  }
  if (m.status === 'confirmada') {
    const c = COMP_COLORS[m.competencia];
    if (c) return `${c.bg} ${c.text} border-b-2 ${c.border} cursor-pointer`;
  }
  return '';
}

interface MarcacaoCardProps {
  marcacao: ComentarioTrecho;
  highlighted: boolean;
  onConfirmar: (id: string, comentario?: string) => void;
  onIgnorar: (id: string) => void;
  onDesfazer?: (id: string) => void;
}

const MarcacaoCard = ({ marcacao, highlighted, onConfirmar, onIgnorar, onDesfazer }: MarcacaoCardProps) => {
  const [editando, setEditando] = useState(false);
  const [comentarioEditado, setComentarioEditado] = useState(marcacao.comentario);
  const c = COMP_COLORS[marcacao.competencia];
  const isConfirmada = marcacao.status === 'confirmada';
  const isIgnorada = marcacao.status === 'ignorada';

  return (
    <div
      id={`marcacao-card-${marcacao.id}`}
      className={[
        'rounded-xl border p-3 space-y-2 transition-all duration-300',
        highlighted ? 'ring-2 ring-violet-400 shadow-md' : '',
        isConfirmada ? 'border-emerald-200 bg-emerald-50/50' : 'border-slate-200 bg-white',
        isIgnorada ? 'opacity-50' : '',
      ].join(' ')}
    >
      {/* Header */}
      <div className="flex items-center gap-2 flex-wrap">
        {c && (
          <span className={`text-[11px] font-black px-2 py-0.5 rounded-full ${c.bg} ${c.text}`}>
            {c.label}
          </span>
        )}
        {marcacao.tipo && (
          <Badge variant="outline" className="text-[10px] h-4 px-1.5 font-medium">
            {TIPO_LABELS[marcacao.tipo] ?? marcacao.tipo}
          </Badge>
        )}
        {isConfirmada && (
          <Badge className="text-[10px] h-4 px-1.5 bg-emerald-600 text-white gap-0.5">
            <Check className="w-2.5 h-2.5" /> Confirmada
          </Badge>
        )}
      </div>

      {/* Trecho */}
      <p className="text-[11px] italic text-slate-500 leading-snug line-clamp-2">
        "...{marcacao.trecho}..."
      </p>

      {/* Comentário / Editor */}
      {editando ? (
        <div className="space-y-2">
          <TextareaWithSpellcheck
            value={comentarioEditado}
            onChange={(e) => setComentarioEditado(e.target.value)}
            className="text-xs min-h-[64px] resize-none"
            maxLength={150}
          />
          <p className="text-[10px] text-slate-400 text-right">{comentarioEditado.length}/150</p>
          <div className="flex gap-1.5">
            <Button
              size="sm"
              className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={() => { onConfirmar(marcacao.id, comentarioEditado); setEditando(false); }}
            >
              <Check className="w-3 h-3 mr-1" /> Confirmar
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 text-xs"
              onClick={() => { setEditando(false); setComentarioEditado(marcacao.comentario); }}
            >
              Cancelar
            </Button>
          </div>
        </div>
      ) : (
        <p className="text-xs text-slate-700 leading-relaxed">{marcacao.comentario}</p>
      )}

      {/* Sugestão de reescrita */}
      {marcacao.sugestao_reescrita && !editando && (
        <div className="rounded-lg bg-slate-50 border border-slate-200 px-2.5 py-1.5">
          <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wide mb-0.5">Sugestão</p>
          <p className="text-[11px] text-slate-700 italic">"{marcacao.sugestao_reescrita}"</p>
        </div>
      )}

      {/* Ações */}
      {!editando && (
        <div className="flex gap-1.5 pt-0.5 flex-wrap">
          {marcacao.status === 'sugerida' && (
            <>
              <Button
                size="sm"
                className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white gap-1"
                onClick={() => onConfirmar(marcacao.id)}
              >
                <Check className="w-3 h-3" /> Confirmar
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs gap-1"
                onClick={() => setEditando(true)}
              >
                <Edit2 className="w-3 h-3" /> Editar
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 text-xs text-slate-400 gap-1"
                onClick={() => onIgnorar(marcacao.id)}
              >
                <X className="w-3 h-3" /> Ignorar
              </Button>
            </>
          )}
          {(isConfirmada || isIgnorada) && onDesfazer && (
            <Button
              size="sm"
              variant="ghost"
              className="h-7 text-xs text-slate-400 gap-1"
              onClick={() => onDesfazer(marcacao.id)}
            >
              <Undo2 className="w-3 h-3" /> Desfazer
            </Button>
          )}
        </div>
      )}
    </div>
  );
};

interface MarcacoesJarvisPanelProps {
  redacaoEnviadaId: string;
  texto: string;
}

export const MarcacoesJarvisPanel = ({ redacaoEnviadaId, texto }: MarcacoesJarvisPanelProps) => {
  const { marcacoes, isLoading, sugeridas, confirmadas, ignoradas, confirmar, ignorar, desfazer } =
    useComentariosTrechoCorrecao(redacaoEnviadaId);

  const [highlightedId, setHighlightedId] = useState<string | null>(null);
  const [showIgnoradas, setShowIgnoradas] = useState(false);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-10">
        <Loader2 className="w-5 h-5 animate-spin text-violet-500 mr-2" />
        <span className="text-sm text-slate-500">Carregando marcações...</span>
      </div>
    );
  }

  if (marcacoes.length === 0) {
    return (
      <div className="text-center py-10 text-slate-400 space-y-1">
        <p className="text-sm">Nenhuma marcação de trecho disponível.</p>
        <p className="text-xs">O Jarvis não gerou marcações para esta redação.</p>
      </div>
    );
  }

  const visiveis = marcacoes.filter(
    m => m.status !== 'ignorada' && m.inicio >= 0 && m.fim <= texto.length && m.fim > m.inicio
  );
  const segments = buildSegments(texto, visiveis);

  const handleClickSegmento = (m: ComentarioTrecho) => {
    setHighlightedId(m.id);
    document.getElementById(`marcacao-card-${m.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setTimeout(() => setHighlightedId(null), 2000);
  };

  return (
    <div className="space-y-5">
      {/* Texto com marcações destacadas */}
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 mb-2">Texto com marcações</p>
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 max-h-56 overflow-y-auto">
          <p className="text-xs leading-relaxed whitespace-pre-wrap text-slate-800">
            {segments.map((seg, idx) =>
              seg.isHighlight && seg.marcacao ? (
                <span
                  key={idx}
                  className={`rounded-sm px-0.5 transition-colors ${highlightClass(seg.marcacao)}`}
                  onClick={() => handleClickSegmento(seg.marcacao!)}
                  title={seg.marcacao.comentario}
                >
                  {seg.texto}
                </span>
              ) : (
                <span key={idx}>{seg.texto}</span>
              )
            )}
          </p>
        </div>
        {/* Legenda */}
        <div className="flex items-center gap-4 mt-1.5">
          <div className="flex items-center gap-1.5">
            <span className="inline-block w-4 h-2 rounded-sm bg-violet-100 border-b-2 border-dashed border-violet-400" />
            <span className="text-[10px] text-slate-400">Pendente</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="inline-block w-4 h-2 rounded-sm bg-blue-100 border-b-2 border-blue-300" />
            <span className="text-[10px] text-slate-400">Confirmada (cor por competência)</span>
          </div>
        </div>
      </div>

      {/* Sugeridas pendentes */}
      {sugeridas.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="w-4 h-4 rounded-full bg-violet-600 text-white text-[9px] flex items-center justify-center font-black shrink-0">
              {sugeridas.length}
            </span>
            <p className="text-[11px] font-bold uppercase tracking-wide text-violet-700">Sugestões pendentes</p>
          </div>
          <div className="space-y-2">
            {sugeridas.map(m => (
              <MarcacaoCard
                key={m.id}
                marcacao={m}
                highlighted={highlightedId === m.id}
                onConfirmar={confirmar}
                onIgnorar={ignorar}
              />
            ))}
          </div>
        </div>
      )}

      {/* Confirmadas */}
      {confirmadas.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="w-4 h-4 rounded-full bg-emerald-600 text-white text-[9px] flex items-center justify-center font-black shrink-0">
              {confirmadas.length}
            </span>
            <p className="text-[11px] font-bold uppercase tracking-wide text-emerald-700">Confirmadas</p>
          </div>
          <div className="space-y-2">
            {confirmadas.map(m => (
              <MarcacaoCard
                key={m.id}
                marcacao={m}
                highlighted={highlightedId === m.id}
                onConfirmar={confirmar}
                onIgnorar={ignorar}
                onDesfazer={desfazer}
              />
            ))}
          </div>
        </div>
      )}

      {/* Ignoradas (colapsável) */}
      {ignoradas.length > 0 && (
        <div>
          <button
            className="text-[11px] text-slate-400 flex items-center gap-1 hover:text-slate-600 transition-colors"
            onClick={() => setShowIgnoradas(v => !v)}
          >
            {showIgnoradas ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            {ignoradas.length} ignorada{ignoradas.length !== 1 ? 's' : ''}
          </button>
          {showIgnoradas && (
            <div className="space-y-2 mt-2">
              {ignoradas.map(m => (
                <MarcacaoCard
                  key={m.id}
                  marcacao={m}
                  highlighted={false}
                  onConfirmar={confirmar}
                  onIgnorar={ignorar}
                  onDesfazer={desfazer}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
