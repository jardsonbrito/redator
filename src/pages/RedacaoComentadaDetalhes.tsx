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
import { ArrowLeft, Calendar, Sparkles } from 'lucide-react';
import { StudentHeader } from '@/components/StudentHeader';
import { AudioPlayer } from '@/components/microaprendizagem/viewers/AudioPlayer';
import { VersaoLapidadaView } from '@/components/redacoes-comentadas/VersaoLapidadaView';
import { supabase } from '@/integrations/supabase/client';
import { usePageTitle } from '@/hooks/useBreadcrumbs';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// ─── Tipos ────────────────────────────────────────────────────────────────────

type TipoBloco =
  | 'texto_original' | 'texto_corrigido' | 'versao_lapidada'
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
  versao_lapidada: 'Versão Lapidada',
  comentarios_trecho: 'Comentários por Trecho',
  comentarios_paragrafo: 'Comentários por Parágrafo',
  analise_global: 'Análise Global',
  orientacao_estudo: 'Orientação de Estudo',
  pontos_fortes: 'Pontos Fortes',
  pontos_melhoria: 'Pontos a Melhorar',
  observacoes_corretor: 'Observações do Corretor',
  competencias_pontuacao: 'Competências',
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
const COMPETENCIA_LABEL_SHORT: Record<string, string> = {
  c1: 'C1', c2: 'C2', c3: 'C3', c4: 'C4', c5: 'C5',
};
const COMPETENCIA_LABEL_FULL: Record<string, string> = {
  c1: 'Competência 1',
  c2: 'Competência 2',
  c3: 'Competência 3',
  c4: 'Competência 4',
  c5: 'Competência 5',
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
  ponto_de_atencao: 'bg-amber-200 text-amber-900 border-b-2 border-amber-500',
};
const TIPO_LABELS_ANOTACAO: Record<string, string> = {
  erro: 'Erro',
  dica: 'Dica',
  elogio: 'Elogio',
  ponto_de_atencao: 'Ponto de atenção',
};
const COMPETENCIA_BADGE_COLORS: Record<string, string> = {
  c1: 'bg-red-100 text-red-700 border-red-200',
  c2: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  c3: 'bg-blue-100 text-blue-700 border-blue-200',
  c4: 'bg-orange-100 text-orange-700 border-orange-200',
  c5: 'bg-purple-100 text-purple-700 border-purple-200',
};

// Cores do bloco de comentário no popup (fundo + texto)
const COMPETENCIA_COMMENT_BG: Record<string, string> = {
  c1: 'bg-red-100 text-red-900 border border-red-300',
  c2: 'bg-emerald-100 text-emerald-900 border border-emerald-300',
  c3: 'bg-blue-100 text-blue-900 border border-blue-300',
  c4: 'bg-orange-100 text-orange-900 border border-orange-300',
  c5: 'bg-purple-100 text-purple-900 border border-purple-300',
};
const TIPO_COMMENT_BG: Record<string, string> = {
  erro: 'bg-red-100 text-red-900 border border-red-300',
  dica: 'bg-blue-100 text-blue-900 border border-blue-300',
  elogio: 'bg-emerald-100 text-emerald-900 border border-emerald-300',
  ponto_de_atencao: 'bg-amber-100 text-amber-900 border border-amber-300',
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

  // Filtra anotações incompletas ou com índices inválidos antes de passar ao parser
  const anotacoesValidas = anotacoes.filter(
    (a) =>
      a &&
      typeof a.start === 'number' &&
      typeof a.end === 'number' &&
      a.end > a.start &&
      a.start >= 0 &&
      a.end <= texto.length &&
      typeof a.comentario === 'string' &&
      a.comentario.trim().length > 0,
  );

  const segments = buildSegments(texto, anotacoesValidas);

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
                ? COMPETENCIA_LABEL_FULL[anotacaoAberta.competencia]
                : 'Comentário'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {/* Trecho = cor da competência (é o erro destacado no texto) */}
            <div className={`rounded p-3 text-sm italic ${
              anotacaoAberta?.competencia && COMPETENCIA_COMMENT_BG[anotacaoAberta.competencia]
                ? COMPETENCIA_COMMENT_BG[anotacaoAberta.competencia]
                : TIPO_COMMENT_BG[anotacaoAberta?.tipo || 'erro'] || 'bg-muted/50'
            }`}>
              {anotacaoAberta?.trecho}
            </div>
            {/* Comentário/correção = neutro */}
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Comentário</p>
            <div className="bg-muted/50 rounded p-3 text-sm leading-relaxed text-foreground">
              {anotacaoAberta?.comentario}
            </div>
            {/* Linha de badges: só exibe quando não há competência vinculada */}
            {!anotacaoAberta?.competencia && (
              <div className="flex gap-2">
                <Badge variant="outline" className="text-xs">
                  {TIPO_LABELS_ANOTACAO[anotacaoAberta?.tipo || ''] ?? anotacaoAberta?.tipo}
                </Badge>
              </div>
            )}
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

  if (tipo === 'versao_lapidada') return null; // renderizado via VersaoLapidadaView no componente pai

  if (tipo === 'texto_original' || tipo === 'texto_corrigido' || tipo === 'analise_global') {
    return (
      <p className="text-sm leading-relaxed whitespace-pre-wrap">{conteudo.texto || ''}</p>
    );
  }

  if (tipo === 'observacoes_corretor') {
    if (conteudo.mostrar_texto === false) return null;
    return (
      <p className="text-sm leading-relaxed whitespace-pre-wrap">{conteudo.texto || ''}</p>
    );
  }

  if (tipo === 'orientacao_estudo') {
    const itens: Array<{ id: string; texto: string }> = conteudo.itens || [];
    return (
      <div className="space-y-2">
        {itens.map((item, idx) => (
          <p key={item.id} className="text-sm leading-relaxed">
            <span className="font-semibold text-primary mr-2">{idx + 1}.</span>
            {item.texto}
          </p>
        ))}
      </div>
    );
  }

  if (tipo === 'pontos_fortes' || tipo === 'pontos_melhoria') {
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
              <div className="flex items-center justify-between">
                <Badge
                  variant="outline"
                  className={`text-sm border ${COMPETENCIA_BADGE_COLORS[c]}`}
                >
                  {COMPETENCIA_LABEL_FULL[c]}
                </Badge>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-xs text-muted-foreground">Pontuação</span>
                  <span className="text-sm font-bold text-primary">{comp[c].nota}</span>
                </div>
              </div>
              {comp[c].comentario && (
                <p className="text-sm text-muted-foreground">{comp[c].comentario}</p>
              )}
            </div>
          )
        ))}
        <div className="border-t pt-3 flex justify-center">
          <span className="text-3xl font-bold text-[#662F96]">{total}</span>
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

// ─── Bloco ativo (componente estável, sem IIFE) ───────────────────────────────

interface BlocoAtivoViewProps {
  bloco: Bloco | null;
  textoOriginal: string;
  modoCorrecaoId: string;
}

const BlocoAtivoView = ({ bloco, textoOriginal, modoCorrecaoId }: BlocoAtivoViewProps) => {
  if (!bloco) return null;

  if (bloco.tipo === 'comentarios_trecho') {
    const anotacoes: Anotacao[] = bloco.conteudo?.anotacoes || [];
    const temAnotacoes = anotacoes.length > 0;

    return (
      <div className="space-y-4">
        {/* Legenda */}
        {temAnotacoes && (
          <Card className="bg-amber-50 border-amber-200">
            <CardContent className="p-3">
              <p className="text-xs font-medium text-amber-800 mb-2">
                Clique nos trechos destacados para ver os comentários:
              </p>
              <div className="flex flex-wrap gap-2">
                {modoCorrecaoId === 'enem'
                  ? COMPETENCIAS.map(c => (
                    <span key={c} className={`text-xs px-2 py-0.5 rounded border ${COMPETENCIA_BADGE_COLORS[c]}`}>
                      {COMPETENCIA_LABEL_FULL[c]}
                    </span>
                  ))
                  : ['erro', 'dica', 'elogio', 'ponto_de_atencao'].map(t => (
                    <span key={t} className={`text-xs px-2 py-0.5 rounded border ${TIPO_HIGHLIGHT[t].replace('border-b-2', 'border')}`}>
                      {TIPO_LABELS_ANOTACAO[t] ?? t}
                    </span>
                  ))
                }
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{TIPO_LABELS[bloco.tipo]}</CardTitle>
          </CardHeader>
          <CardContent>
            {textoOriginal ? (
              // key={bloco.id} garante que o componente é recriado apenas ao trocar de bloco,
              // não em cada re-render do pai — preserva o estado anotacaoAberta durante o clique
              <TrechoHighlightedText
                key={bloco.id}
                texto={textoOriginal}
                anotacoes={anotacoes}
              />
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
      {bloco.tipo !== 'competencias_pontuacao' && (
        <CardHeader className="pb-2">
          {bloco.tipo === 'observacoes_corretor' && bloco.conteudo?.audio_url && bloco.conteudo?.mostrar_audio !== false ? (
            <div className="flex items-center gap-4 w-full">
              <CardTitle className="text-base w-1/2">{TIPO_LABELS[bloco.tipo]}</CardTitle>
              <div className="w-1/2">
                <AudioPlayer
                  url={bloco.conteudo.audio_url}
                  durationHint={bloco.conteudo.audio_duration ?? undefined}
                />
              </div>
            </div>
          ) : (
            <CardTitle className="text-base">{TIPO_LABELS[bloco.tipo]}</CardTitle>
          )}
        </CardHeader>
      )}
      <CardContent className={bloco.tipo === 'competencias_pontuacao' ? 'pt-6' : ''}>
        <BlocoRenderer bloco={bloco} />
      </CardContent>
    </Card>
  );
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
  const [textoOriginal, setTextoOriginal] = useState<string>('');
  const [textoLapidado, setTextoLapidado] = useState<string>('');
  const [modoLeitura, setModoLeitura] = useState<'original' | 'lapidada'>('original');

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
          // Busca TODOS os blocos (incluindo texto_original independente de visivel)
          // para garantir que o texto base esteja sempre disponível para os highlights
          supabase
            .from('redacao_comentada_blocos')
            .select('*')
            .eq('redacao_comentada_id', id)
            .order('ordem'),
        ]);
        if (rcRes.error) throw rcRes.error;
        if (!rcRes.data) throw new Error('Redação não encontrada');
        setRedacao(rcRes.data as RedacaoComentada);
        const todos = (blocosRes.data || []) as Bloco[];
        // versao_lapidada é extraída mas não aparece como aba de navegação
        const visiveis = todos.filter(b => b.visivel && b.tipo !== 'versao_lapidada');
        setBlocos(visiveis);
        if (visiveis.length > 0) setBlocoAtivoId(visiveis[0].id);
        // Texto original e lapidado extraídos de todos os blocos
        const txtBloco = todos.find(b => b.tipo === 'texto_original');
        setTextoOriginal(txtBloco?.conteudo?.texto ?? '');
        const lapBloco = todos.find(b => b.tipo === 'versao_lapidada' && b.visivel);
        setTextoLapidado(lapBloco?.conteudo?.texto ?? '');
      } catch (err: any) {
        setError(err.message || 'Erro ao carregar redação');
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [id]);

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

        {/* Toggle Original | Lapidada — só aparece quando há versão lapidada */}
        {textoLapidado && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground font-medium">Visualização:</span>
            <div className="flex rounded-full border border-gray-200 overflow-hidden text-xs font-medium">
              <button
                onClick={() => setModoLeitura('original')}
                className={`px-3 py-1.5 transition-colors ${
                  modoLeitura === 'original'
                    ? 'bg-[#662F96] text-white'
                    : 'bg-white text-gray-600 hover:bg-gray-50'
                }`}
              >
                Original
              </button>
              <button
                onClick={() => setModoLeitura('lapidada')}
                className={`px-3 py-1.5 flex items-center gap-1.5 transition-colors ${
                  modoLeitura === 'lapidada'
                    ? 'bg-amber-500 text-white'
                    : 'bg-white text-gray-600 hover:bg-amber-50'
                }`}
              >
                <Sparkles className="w-3 h-3" />
                Lapidada
              </button>
            </div>
          </div>
        )}

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
        {modoLeitura === 'lapidada' && textoLapidado ? (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-500" />
                Versão Lapidada
              </CardTitle>
            </CardHeader>
            <CardContent>
              <VersaoLapidadaView
                textoOriginal={textoOriginal}
                textoLapidado={textoLapidado}
              />
            </CardContent>
          </Card>
        ) : (
          <BlocoAtivoView
            bloco={blocos.find(b => b.id === blocoAtivoId) ?? null}
            textoOriginal={textoOriginal}
            modoCorrecaoId={redacao.modo_correcao_id}
          />
        )}
      </main>
    </div>
  );
};

export default RedacaoComentadaDetalhes;
