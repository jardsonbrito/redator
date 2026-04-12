import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ArrowLeft, Calendar } from 'lucide-react';
import { StudentHeader } from '@/components/StudentHeader';
import { supabase } from '@/integrations/supabase/client';
import { usePageTitle } from '@/hooks/useBreadcrumbs';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// ─── Tipos ────────────────────────────────────────────────────────────────────

type TipoBloco =
  | 'texto_original' | 'texto_corrigido'
  | 'comentarios_trecho' | 'comentarios_paragrafo'
  | 'analise_global' | 'orientacao_estudo'
  | 'pontos_fortes' | 'pontos_melhoria'
  | 'observacoes_corretor' | 'competencias_pontuacao';

interface Anotacao {
  id: string;
  start: number;
  end: number;
  trecho: string;
  comentario: string;
  tipo: string;
  competencia?: string;
}

interface Bloco {
  id: string;
  tipo: TipoBloco;
  ordem: number;
  visivel: boolean;
  conteudo: any;
}

interface RedacaoComentada {
  id: string;
  titulo: string;
  modo_correcao_id: string;
  publicado_em: string | null;
}

// ─── Constantes ───────────────────────────────────────────────────────────────

const TIPO_LABELS: Record<TipoBloco, string> = {
  texto_original: 'Texto Original',
  texto_corrigido: 'Texto Corrigido',
  comentarios_trecho: 'Comentários por Trecho',
  comentarios_paragrafo: 'Comentários por Parágrafo',
  analise_global: 'Análise Global',
  orientacao_estudo: 'Orientação de Estudo',
  pontos_fortes: 'Pontos Fortes',
  pontos_melhoria: 'Pontos a Melhorar',
  observacoes_corretor: 'Observações do Corretor',
  competencias_pontuacao: 'Competências e Pontuação',
};

const MODO_LABELS: Record<string, string> = {
  enem: 'ENEM',
  pedagogico: 'Pedagógico',
  revisao_linguistica: 'Revisão Linguística',
};

const MODO_COLORS: Record<string, string> = {
  enem: 'bg-red-100 text-red-700 border-red-200',
  pedagogico: 'bg-blue-100 text-blue-700 border-blue-200',
  revisao_linguistica: 'bg-green-100 text-green-700 border-green-200',
};

const COMPETENCIAS = ['c1', 'c2', 'c3', 'c4', 'c5'] as const;
const COMPETENCIA_LABELS: Record<string, string> = {
  c1: 'C1 – Norma Culta',
  c2: 'C2 – Tema e Gênero',
  c3: 'C3 – Argumentação',
  c4: 'C4 – Coesão',
  c5: 'C5 – Proposta de Intervenção',
};
const COMPETENCIA_LABEL_SHORT: Record<string, string> = {
  c1: 'C1', c2: 'C2', c3: 'C3', c4: 'C4', c5: 'C5',
};

// Cores para highlight dos trechos: por competência (ENEM) ou por tipo
const COMPETENCIA_HIGHLIGHT: Record<string, string> = {
  c1: 'bg-red-200 text-red-900 border-b-2 border-red-400',
  c2: 'bg-emerald-200 text-emerald-900 border-b-2 border-emerald-400',
  c3: 'bg-blue-200 text-blue-900 border-b-2 border-blue-400',
  c4: 'bg-orange-200 text-orange-900 border-b-2 border-orange-400',
  c5: 'bg-purple-200 text-purple-900 border-b-2 border-purple-400',
};
const TIPO_HIGHLIGHT: Record<string, string> = {
  erro: 'bg-red-200 text-red-900 border-b-2 border-red-400',
  dica: 'bg-blue-200 text-blue-900 border-b-2 border-blue-400',
  elogio: 'bg-emerald-200 text-emerald-900 border-b-2 border-emerald-400',
};
const COMPETENCIA_BADGE_COLORS: Record<string, string> = {
  c1: 'bg-red-100 text-red-700 border-red-200',
  c2: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  c3: 'bg-blue-100 text-blue-700 border-blue-200',
  c4: 'bg-orange-100 text-orange-700 border-orange-200',
  c5: 'bg-purple-100 text-purple-700 border-purple-200',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

interface Segmento {
  texto: string;
  isHighlight: boolean;
  anotacao?: Anotacao;
}

function buildSegments(texto: string, anotacoes: Anotacao[]): Segmento[] {
  if (!anotacoes.length) return [{ texto, isHighlight: false }];

  // Ordenar por start
  const sorted = [...anotacoes].sort((a, b) => a.start - b.start);

  const segments: Segmento[] = [];
  let cursor = 0;

  for (const a of sorted) {
    if (a.start > cursor) {
      segments.push({ texto: texto.slice(cursor, a.start), isHighlight: false });
    }
    if (a.end > a.start) {
      segments.push({
        texto: texto.slice(a.start, a.end),
        isHighlight: true,
        anotacao: a,
      });
    }
    cursor = Math.max(cursor, a.end);
  }

  if (cursor < texto.length) {
    segments.push({ texto: texto.slice(cursor), isHighlight: false });
  }

  return segments;
}

// ─── Texto com trechos destacados ────────────────────────────────────────────

interface TrechoHighlightProps {
  texto: string;
  anotacoes: Anotacao[];
}

const TrechoHighlightedText = ({ texto, anotacoes }: TrechoHighlightProps) => {
  const [anotacaoAberta, setAnotacaoAberta] = useState<Anotacao | null>(null);
  const segments = buildSegments(texto, anotacoes);

  const getHighlightClass = (a: Anotacao) => {
    if (a.competencia && COMPETENCIA_HIGHLIGHT[a.competencia]) {
      return COMPETENCIA_HIGHLIGHT[a.competencia];
    }
    return TIPO_HIGHLIGHT[a.tipo] || TIPO_HIGHLIGHT.erro;
  };

  return (
    <>
      <p className="text-sm leading-relaxed whitespace-pre-wrap">
        {segments.map((seg, idx) =>
          seg.isHighlight && seg.anotacao ? (
            <span
              key={idx}
              className={`cursor-pointer rounded px-0.5 ${getHighlightClass(seg.anotacao)}`}
              onClick={() => setAnotacaoAberta(seg.anotacao!)}
              title="Clique para ver o comentário"
            >
              {seg.texto}
            </span>
          ) : (
            <span key={idx}>{seg.texto}</span>
          )
        )}
      </p>

      <Dialog open={!!anotacaoAberta} onOpenChange={(open) => !open && setAnotacaoAberta(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base">
              {anotacaoAberta?.competencia
                ? COMPETENCIA_LABELS[anotacaoAberta.competencia]
                : 'Comentário'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="bg-muted/50 rounded p-3 text-sm italic text-muted-foreground">
              "{anotacaoAberta?.trecho}"
            </div>
            <p className="text-sm">{anotacaoAberta?.comentario}</p>
            <div className="flex gap-2">
              {anotacaoAberta?.competencia && (
                <Badge
                  variant="outline"
                  className={`text-xs border ${COMPETENCIA_BADGE_COLORS[anotacaoAberta.competencia]}`}
                >
                  {COMPETENCIA_LABEL_SHORT[anotacaoAberta.competencia]}
                </Badge>
              )}
              <Badge variant="outline" className="text-xs capitalize">
                {anotacaoAberta?.tipo}
              </Badge>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

// ─── Renderizador de blocos ───────────────────────────────────────────────────

interface BlocoRendererProps {
  bloco: Bloco;
}

const BlocoRenderer = ({ bloco }: BlocoRendererProps) => {
  const { tipo, conteudo } = bloco;

  if (tipo === 'texto_original' || tipo === 'texto_corrigido' ||
      tipo === 'analise_global' || tipo === 'observacoes_corretor') {
    return (
      <p className="text-sm leading-relaxed whitespace-pre-wrap">{conteudo.texto || ''}</p>
    );
  }

  if (tipo === 'orientacao_estudo' || tipo === 'pontos_fortes' || tipo === 'pontos_melhoria') {
    const itens: Array<{ id: string; texto: string }> = conteudo.itens || [];
    return (
      <ul className="space-y-1.5">
        {itens.map((item) => (
          <li key={item.id} className="flex gap-2 text-sm">
            <span className="text-primary mt-0.5">•</span>
            <span>{item.texto}</span>
          </li>
        ))}
      </ul>
    );
  }

  if (tipo === 'comentarios_paragrafo') {
    const paragrafos: Array<{ id: string; numero: number; titulo: string; comentario: string }> =
      conteudo.paragrafos || [];
    return (
      <div className="space-y-3">
        {paragrafos.map((p) => (
          <div key={p.id} className="border-l-4 border-primary/30 pl-3">
            <p className="text-xs font-semibold text-muted-foreground mb-1">
              Parágrafo {p.numero}{p.titulo ? ` – ${p.titulo}` : ''}
            </p>
            <p className="text-sm">{p.comentario}</p>
          </div>
        ))}
      </div>
    );
  }

  if (tipo === 'competencias_pontuacao') {
    const comp = conteudo.competencias || {};
    const total = conteudo.total ?? COMPETENCIAS.reduce((sum, c) => sum + (Number(comp[c]?.nota) || 0), 0);
    return (
      <div className="space-y-3">
        {COMPETENCIAS.map((c) => (
          comp[c] && (
            <div key={c} className="space-y-1">
              <div className="flex items-center gap-2">
                <Badge
                  variant="outline"
                  className={`text-xs border ${COMPETENCIA_BADGE_COLORS[c]}`}
                >
                  {COMPETENCIA_LABEL_SHORT[c]}
                </Badge>
                <span className="text-sm font-medium">{COMPETENCIA_LABELS[c]}</span>
                <span className="ml-auto text-sm font-bold text-primary">
                  {comp[c].nota}/200
                </span>
              </div>
              {comp[c].comentario && (
                <p className="text-sm text-muted-foreground pl-8">{comp[c].comentario}</p>
              )}
            </div>
          )
        ))}
        <div className="border-t pt-2 flex justify-between items-center">
          <span className="text-sm font-semibold">Total</span>
          <span className="text-xl font-bold text-primary">{total}/1000</span>
        </div>
      </div>
    );
  }

  if (tipo === 'comentarios_trecho') {
    // O texto original precisa vir do bloco texto_original — passa via prop padre
    return null; // gerenciado pelo componente pai com acesso a todos blocos
  }

  return null;
};

// ─── Página principal ─────────────────────────────────────────────────────────

const RedacaoComentadaDetalhes = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [redacao, setRedacao] = useState<RedacaoComentada | null>(null);
  const [blocos, setBlocos] = useState<Bloco[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [blocoAtivoId, setBlocoAtivoId] = useState<string | null>(null);

  usePageTitle(redacao?.titulo || 'Redação Comentada');

  useEffect(() => {
    if (!id) return;
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const [rcRes, blocosRes] = await Promise.all([
          supabase
            .from('redacoes_comentadas')
            .select('id, titulo, modo_correcao_id, publicado_em')
            .eq('id', id)
            .single(),
          supabase
            .from('redacao_comentada_blocos')
            .select('*')
            .eq('redacao_comentada_id', id)
            .eq('visivel', true)
            .order('ordem'),
        ]);
        if (rcRes.error) throw rcRes.error;
        if (!rcRes.data) throw new Error('Redação não encontrada');
        setRedacao(rcRes.data as RedacaoComentada);
        const bls = (blocosRes.data || []) as Bloco[];
        setBlocos(bls);
        if (bls.length > 0) setBlocoAtivoId(bls[0].id);
      } catch (err: any) {
        setError(err.message || 'Erro ao carregar redação');
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [id]);

  const textoOriginal = blocos.find(b => b.tipo === 'texto_original')?.conteudo?.texto || '';

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-violet-100">
        <StudentHeader pageTitle="Carregando..." />
        <main className="container mx-auto px-4 py-8 max-w-4xl">
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-32 bg-muted rounded-lg animate-pulse" />
            ))}
          </div>
        </main>
      </div>
    );
  }

  if (error || !redacao) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-violet-100">
        <StudentHeader pageTitle="Erro" />
        <main className="container mx-auto px-4 py-8 max-w-4xl">
          <Card>
            <CardContent className="text-center py-12">
              <p className="text-destructive">{error || 'Redação não encontrada'}</p>
              <Button variant="link" onClick={() => navigate(-1)} className="mt-2">
                Voltar
              </Button>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-violet-100">
      <StudentHeader pageTitle="Redações Comentadas" />

      <main className="container mx-auto px-4 py-8 max-w-4xl space-y-6">
        {/* Cabeçalho da redação */}
        <div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(-1)}
            className="mb-3 -ml-1 gap-1.5 text-muted-foreground"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar
          </Button>
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <h1 className="text-2xl font-bold text-primary leading-snug">{redacao.titulo}</h1>
            <Badge
              variant="outline"
              className={`text-sm border shrink-0 ${MODO_COLORS[redacao.modo_correcao_id] || ''}`}
            >
              {MODO_LABELS[redacao.modo_correcao_id] || redacao.modo_correcao_id}
            </Badge>
          </div>
          {redacao.publicado_em && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1.5">
              <Calendar className="w-3.5 h-3.5" />
              {format(new Date(redacao.publicado_em), "d 'de' MMMM 'de' yyyy", { locale: ptBR })}
            </div>
          )}
        </div>

        {/* Chips de navegação entre blocos */}
        {blocos.length > 0 && (
          <div className="flex gap-2 overflow-x-auto pb-1">
            {blocos.map((bloco) => (
              <button
                key={bloco.id}
                onClick={() => setBlocoAtivoId(bloco.id)}
                className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors text-white ${
                  blocoAtivoId === bloco.id
                    ? 'bg-[#662F96]'
                    : 'bg-[#B175FF] hover:bg-[#662F96]'
                }`}
              >
                {TIPO_LABELS[bloco.tipo]}
              </button>
            ))}
          </div>
        )}

        {/* Bloco ativo */}
        {(() => {
          const bloco = blocos.find(b => b.id === blocoAtivoId);
          if (!bloco) return null;

          // Legenda para comentários por trecho
          const legendaElement = bloco.tipo === 'comentarios_trecho' &&
            (bloco.conteudo?.anotacoes?.length ?? 0) > 0 ? (
            <Card className="bg-amber-50 border-amber-200">
              <CardContent className="p-3">
                <p className="text-xs font-medium text-amber-800 mb-2">
                  Legenda — clique nos trechos destacados para ver os comentários:
                </p>
                <div className="flex flex-wrap gap-2">
                  {redacao.modo_correcao_id === 'enem'
                    ? COMPETENCIAS.map(c => (
                      <span key={c} className={`text-xs px-2 py-0.5 rounded border ${COMPETENCIA_BADGE_COLORS[c]}`}>
                        {COMPETENCIA_LABEL_SHORT[c]}
                      </span>
                    ))
                    : ['erro', 'dica', 'elogio'].map(t => (
                      <span key={t} className={`text-xs px-2 py-0.5 rounded border capitalize ${TIPO_HIGHLIGHT[t].replace('border-b-2', 'border')}`}>
                        {t}
                      </span>
                    ))
                  }
                </div>
              </CardContent>
            </Card>
          ) : null;

          if (bloco.tipo === 'comentarios_trecho') {
            const anotacoes: Anotacao[] = bloco.conteudo?.anotacoes || [];
            return (
              <div className="space-y-4">
                {legendaElement}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">{TIPO_LABELS[bloco.tipo]}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {textoOriginal ? (
                      <TrechoHighlightedText texto={textoOriginal} anotacoes={anotacoes} />
                    ) : (
                      <p className="text-sm text-muted-foreground italic">
                        Texto original não disponível para destacar trechos.
                      </p>
                    )}
                  </CardContent>
                </Card>
              </div>
            );
          }

          return (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">{TIPO_LABELS[bloco.tipo]}</CardTitle>
              </CardHeader>
              <CardContent>
                <BlocoRenderer bloco={bloco} />
              </CardContent>
            </Card>
          );
        })()}
      </main>
    </div>
  );
};

export default RedacaoComentadaDetalhes;
