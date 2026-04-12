import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import {
  ChevronUp, ChevronDown, Eye, EyeOff, Trash2, Plus, X, ArrowLeft, Save, Loader2,
} from 'lucide-react';
import { TURMAS_VALIDAS } from '@/utils/turmaUtils';
const uuidv4 = () => crypto.randomUUID();

// ─── Tipos ───────────────────────────────────────────────────────────────────

type TipoBloco =
  | 'texto_original' | 'texto_corrigido'
  | 'comentarios_trecho' | 'comentarios_paragrafo'
  | 'analise_global' | 'orientacao_estudo'
  | 'pontos_fortes' | 'pontos_melhoria'
  | 'observacoes_corretor' | 'competencias_pontuacao';

interface Bloco {
  localId: string;
  dbId?: string;
  tipo: TipoBloco;
  ordem: number;
  visivel: boolean;
  conteudo: any;
}

interface ModoCorrecao {
  id: string;
  nome: string;
  descricao: string | null;
  blocos_padrao: Array<{ tipo: TipoBloco; ordem: number; visivel: boolean }>;
}

interface TurmaProfessor {
  id: string;
  nome: string;
}

interface Props {
  editingId?: string | null;
  onSuccess: () => void;
  onCancel: () => void;
}

// ─── Constantes ──────────────────────────────────────────────────────────────

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
  competencias_pontuacao: 'Competências e Pontuação (ENEM)',
};

const TODOS_TIPOS: TipoBloco[] = [
  'texto_original', 'texto_corrigido', 'comentarios_trecho', 'comentarios_paragrafo',
  'analise_global', 'orientacao_estudo', 'pontos_fortes', 'pontos_melhoria',
  'observacoes_corretor', 'competencias_pontuacao',
];

const COMPETENCIAS = ['c1', 'c2', 'c3', 'c4', 'c5'] as const;
const COMPETENCIA_LABELS = { c1: 'C1', c2: 'C2', c3: 'C3', c4: 'C4', c5: 'C5' };
const COMPETENCIA_COLORS: Record<string, string> = {
  c1: 'bg-red-100 text-red-700 border-red-300',
  c2: 'bg-emerald-100 text-emerald-700 border-emerald-300',
  c3: 'bg-blue-100 text-blue-700 border-blue-300',
  c4: 'bg-orange-100 text-orange-700 border-orange-300',
  c5: 'bg-purple-100 text-purple-700 border-purple-300',
};

const TIPO_ANOTACAO_OPTIONS = ['erro', 'dica', 'elogio'];

function conteudoPadrao(tipo: TipoBloco): any {
  switch (tipo) {
    case 'texto_original':
    case 'texto_corrigido':
    case 'analise_global':
    case 'observacoes_corretor':
      return { texto: '' };
    case 'comentarios_trecho':
      return { anotacoes: [] };
    case 'comentarios_paragrafo':
      return { paragrafos: [] };
    case 'orientacao_estudo':
    case 'pontos_fortes':
    case 'pontos_melhoria':
      return { itens: [] };
    case 'competencias_pontuacao':
      return {
        competencias: {
          c1: { nota: 0, comentario: '' },
          c2: { nota: 0, comentario: '' },
          c3: { nota: 0, comentario: '' },
          c4: { nota: 0, comentario: '' },
          c5: { nota: 0, comentario: '' },
        },
        total: 0,
      };
    default:
      return {};
  }
}

// ─── Editor de conteúdo por tipo ─────────────────────────────────────────────

interface BlocoEditorProps {
  bloco: Bloco;
  textoOriginal: string;
  onChange: (localId: string, conteudo: any) => void;
}

const BlocoEditor = ({ bloco, textoOriginal, onChange }: BlocoEditorProps) => {
  const update = (partial: any) => onChange(bloco.localId, { ...bloco.conteudo, ...partial });

  if (bloco.tipo === 'texto_original' || bloco.tipo === 'texto_corrigido' ||
      bloco.tipo === 'analise_global' || bloco.tipo === 'observacoes_corretor') {
    return (
      <Textarea
        value={bloco.conteudo.texto || ''}
        onChange={(e) => update({ texto: e.target.value })}
        rows={6}
        placeholder={`Digite o ${TIPO_LABELS[bloco.tipo].toLowerCase()}...`}
        className="text-sm"
      />
    );
  }

  if (bloco.tipo === 'orientacao_estudo' || bloco.tipo === 'pontos_fortes' || bloco.tipo === 'pontos_melhoria') {
    const itens: Array<{ id: string; texto: string }> = bloco.conteudo.itens || [];
    return (
      <div className="space-y-2">
        {itens.map((item) => (
          <div key={item.id} className="flex gap-2">
            <Input
              value={item.texto}
              onChange={(e) => {
                const novo = itens.map(i => i.id === item.id ? { ...i, texto: e.target.value } : i);
                update({ itens: novo });
              }}
              placeholder="Digite o item..."
              className="text-sm"
            />
            <Button
              variant="ghost"
              size="sm"
              className="shrink-0 h-9 w-9 p-0 text-muted-foreground"
              onClick={() => update({ itens: itens.filter(i => i.id !== item.id) })}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        ))}
        <Button
          variant="outline"
          size="sm"
          onClick={() => update({ itens: [...itens, { id: uuidv4(), texto: '' }] })}
        >
          <Plus className="w-3.5 h-3.5 mr-1" />
          Adicionar item
        </Button>
      </div>
    );
  }

  if (bloco.tipo === 'comentarios_paragrafo') {
    const paragrafos: Array<{ id: string; numero: number; titulo: string; comentario: string }> =
      bloco.conteudo.paragrafos || [];
    return (
      <div className="space-y-3">
        {paragrafos.map((par) => (
          <div key={par.id} className="border rounded-lg p-3 space-y-2 bg-muted/30">
            <div className="flex gap-2 items-center">
              <Input
                type="number"
                value={par.numero}
                onChange={(e) => {
                  const novo = paragrafos.map(p => p.id === par.id ? { ...p, numero: Number(e.target.value) } : p);
                  update({ paragrafos: novo });
                }}
                className="w-20 text-sm"
                placeholder="Nº"
                min={1}
              />
              <Input
                value={par.titulo}
                onChange={(e) => {
                  const novo = paragrafos.map(p => p.id === par.id ? { ...p, titulo: e.target.value } : p);
                  update({ paragrafos: novo });
                }}
                placeholder="Título (ex.: Introdução)"
                className="text-sm flex-1"
              />
              <Button
                variant="ghost"
                size="sm"
                className="shrink-0 h-9 w-9 p-0 text-muted-foreground"
                onClick={() => update({ paragrafos: paragrafos.filter(p => p.id !== par.id) })}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
            <Textarea
              value={par.comentario}
              onChange={(e) => {
                const novo = paragrafos.map(p => p.id === par.id ? { ...p, comentario: e.target.value } : p);
                update({ paragrafos: novo });
              }}
              rows={3}
              placeholder="Comentário sobre este parágrafo..."
              className="text-sm"
            />
          </div>
        ))}
        <Button
          variant="outline"
          size="sm"
          onClick={() => update({ paragrafos: [...paragrafos, { id: uuidv4(), numero: paragrafos.length + 1, titulo: '', comentario: '' }] })}
        >
          <Plus className="w-3.5 h-3.5 mr-1" />
          Adicionar parágrafo
        </Button>
      </div>
    );
  }

  if (bloco.tipo === 'competencias_pontuacao') {
    const comp = bloco.conteudo.competencias || {};
    const total = COMPETENCIAS.reduce((sum, c) => sum + (Number(comp[c]?.nota) || 0), 0);
    return (
      <div className="space-y-3">
        {COMPETENCIAS.map((c) => (
          <div key={c} className="border rounded-lg p-3 space-y-2">
            <div className="flex items-center gap-3">
              <Badge className={`border text-xs shrink-0 ${COMPETENCIA_COLORS[c]}`}>
                {COMPETENCIA_LABELS[c]}
              </Badge>
              <div className="flex items-center gap-2">
                <Label className="text-xs text-muted-foreground whitespace-nowrap">Nota (0–200):</Label>
                <Input
                  type="number"
                  min={0}
                  max={200}
                  step={40}
                  value={comp[c]?.nota || 0}
                  onChange={(e) => {
                    const novoComp = { ...comp, [c]: { ...comp[c], nota: Number(e.target.value) } };
                    const novoTotal = COMPETENCIAS.reduce((sum, k) => sum + (Number(novoComp[k]?.nota) || 0), 0);
                    update({ competencias: novoComp, total: novoTotal });
                  }}
                  className="w-24 text-sm"
                />
              </div>
            </div>
            <Textarea
              value={comp[c]?.comentario || ''}
              onChange={(e) => {
                const novoComp = { ...comp, [c]: { ...comp[c], comentario: e.target.value } };
                update({ competencias: novoComp });
              }}
              rows={2}
              placeholder={`Comentário sobre ${COMPETENCIA_LABELS[c]}...`}
              className="text-sm"
            />
          </div>
        ))}
        <div className="text-right font-semibold text-primary">
          Total: {total} / 1000
        </div>
      </div>
    );
  }

  if (bloco.tipo === 'comentarios_trecho') {
    return (
      <TrechoEditor
        conteudo={bloco.conteudo}
        textoOriginal={textoOriginal}
        onChange={(novoConteudo) => onChange(bloco.localId, novoConteudo)}
      />
    );
  }

  return <p className="text-sm text-muted-foreground">Editor não disponível para este tipo.</p>;
};

// ─── Editor de trechos ────────────────────────────────────────────────────────

interface TrechoEditorProps {
  conteudo: any;
  textoOriginal: string;
  onChange: (novoConteudo: any) => void;
}

interface Anotacao {
  id: string;
  start: number;
  end: number;
  trecho: string;
  comentario: string;
  tipo: string;
  competencia?: string;
}

const TrechoEditor = ({ conteudo, textoOriginal, onChange }: TrechoEditorProps) => {
  const anotacoes: Anotacao[] = conteudo.anotacoes || [];
  const [novaAnotacao, setNovaAnotacao] = useState<Partial<Anotacao> | null>(null);
  const textoRef = useRef<HTMLDivElement>(null);

  const handleMouseUp = () => {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || !textoRef.current) return;
    const range = sel.getRangeAt(0);
    const container = textoRef.current;
    // Calcular offset absoluto dentro do container
    const preRange = document.createRange();
    preRange.selectNodeContents(container);
    preRange.setEnd(range.startContainer, range.startOffset);
    const start = preRange.toString().length;
    const selected = sel.toString();
    if (!selected.trim()) return;
    setNovaAnotacao({
      id: uuidv4(),
      start,
      end: start + selected.length,
      trecho: selected,
      comentario: '',
      tipo: 'erro',
      competencia: '',
    });
    sel.removeAllRanges();
  };

  const handleSalvarAnotacao = () => {
    if (!novaAnotacao || !novaAnotacao.comentario?.trim()) {
      toast.error('Digite um comentário para a anotação');
      return;
    }
    const nova: Anotacao = {
      id: novaAnotacao.id!,
      start: novaAnotacao.start!,
      end: novaAnotacao.end!,
      trecho: novaAnotacao.trecho!,
      comentario: novaAnotacao.comentario!,
      tipo: novaAnotacao.tipo || 'erro',
      competencia: novaAnotacao.competencia || undefined,
    };
    onChange({ anotacoes: [...anotacoes, nova] });
    setNovaAnotacao(null);
  };

  const handleRemoverAnotacao = (id: string) => {
    onChange({ anotacoes: anotacoes.filter(a => a.id !== id) });
  };

  return (
    <div className="space-y-3">
      {textoOriginal ? (
        <>
          <p className="text-xs text-muted-foreground">
            Selecione um trecho no texto abaixo para criar uma anotação:
          </p>
          <div
            ref={textoRef}
            onMouseUp={handleMouseUp}
            className="border rounded-lg p-3 text-sm whitespace-pre-wrap leading-relaxed bg-amber-50 cursor-text select-text"
          >
            {textoOriginal}
          </div>
        </>
      ) : (
        <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded p-2">
          Adicione um bloco "Texto Original" e preencha o texto para habilitar a seleção de trechos.
        </p>
      )}

      {novaAnotacao && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="p-3 space-y-2">
            <p className="text-xs font-medium text-primary">
              Trecho selecionado: <span className="font-normal italic">"{novaAnotacao.trecho}"</span>
            </p>
            <Textarea
              value={novaAnotacao.comentario || ''}
              onChange={(e) => setNovaAnotacao(prev => prev ? { ...prev, comentario: e.target.value } : null)}
              rows={2}
              placeholder="Comentário sobre este trecho..."
              className="text-sm"
              autoFocus
            />
            <div className="flex gap-2 flex-wrap">
              <Select
                value={novaAnotacao.tipo || 'erro'}
                onValueChange={(v) => setNovaAnotacao(prev => prev ? { ...prev, tipo: v } : null)}
              >
                <SelectTrigger className="w-32 h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIPO_ANOTACAO_OPTIONS.map(t => (
                    <SelectItem key={t} value={t} className="text-xs capitalize">{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={novaAnotacao.competencia || ''}
                onValueChange={(v) => setNovaAnotacao(prev => prev ? { ...prev, competencia: v } : null)}
              >
                <SelectTrigger className="w-36 h-8 text-xs">
                  <SelectValue placeholder="Competência (opt.)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="" className="text-xs">Sem competência</SelectItem>
                  {COMPETENCIAS.map(c => (
                    <SelectItem key={c} value={c} className="text-xs">{COMPETENCIA_LABELS[c]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button size="sm" className="h-8 text-xs" onClick={handleSalvarAnotacao}>
                Salvar
              </Button>
              <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={() => setNovaAnotacao(null)}>
                Cancelar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {anotacoes.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-muted-foreground">
            {anotacoes.length} anotação(ões):
          </p>
          {anotacoes.map((a) => (
            <div
              key={a.id}
              className="flex items-start gap-2 border rounded p-2 text-xs bg-muted/30"
            >
              <div className="flex-1 min-w-0">
                <span className="italic text-muted-foreground">"{a.trecho}"</span>
                {' — '}
                <span>{a.comentario}</span>
                <div className="flex gap-1 mt-1 flex-wrap">
                  <Badge variant="outline" className="text-xs capitalize">{a.tipo}</Badge>
                  {a.competencia && (
                    <Badge className={`text-xs border ${COMPETENCIA_COLORS[a.competencia]}`}>
                      {COMPETENCIA_LABELS[a.competencia as keyof typeof COMPETENCIA_LABELS]}
                    </Badge>
                  )}
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 text-muted-foreground shrink-0"
                onClick={() => handleRemoverAnotacao(a.id)}
              >
                <X className="w-3 h-3" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ─── Formulário principal ─────────────────────────────────────────────────────

export const RedacaoComentadaForm = ({ editingId, onSuccess, onCancel }: Props) => {
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(!!editingId);
  const [activeSection, setActiveSection] = useState<'info' | 'blocos'>('info');

  const [titulo, setTitulo] = useState('');
  const [modoCorrecaoId, setModoCorrecaoId] = useState('enem');
  const [turmasAutorizadas, setTurmasAutorizadas] = useState<string[]>([]);
  const [ativo, setAtivo] = useState(false);
  const [blocos, setBlocos] = useState<Bloco[]>([]);

  const [modosCorrecao, setModosCorrecao] = useState<ModoCorrecao[]>([]);
  const [turmasProfessores, setTurmasProfessores] = useState<TurmaProfessor[]>([]);

  // Tipo de bloco a adicionar manualmente
  const [tipoParaAdicionar, setTipoParaAdicionar] = useState<TipoBloco>('texto_original');

  // Carrega modos e turmas de professores
  useEffect(() => {
    const carregar = async () => {
      const [modosRes, turmasRes] = await Promise.all([
        supabase.from('modos_correcao').select('*').order('id'),
        supabase.from('turmas_professores').select('id, nome').eq('ativo', true).order('nome'),
      ]);
      setModosCorrecao((modosRes.data || []) as ModoCorrecao[]);
      setTurmasProfessores((turmasRes.data || []) as TurmaProfessor[]);
    };
    carregar();
  }, []);

  // Modo para edição: carrega dados existentes
  useEffect(() => {
    if (!editingId) { setInitialLoading(false); return; }
    const carregar = async () => {
      setInitialLoading(true);
      try {
        const [rcRes, blocosRes] = await Promise.all([
          supabase.from('redacoes_comentadas').select('*').eq('id', editingId).single(),
          supabase.from('redacao_comentada_blocos').select('*').eq('redacao_comentada_id', editingId).order('ordem'),
        ]);
        if (rcRes.data) {
          const rc = rcRes.data as any;
          setTitulo(rc.titulo);
          setModoCorrecaoId(rc.modo_correcao_id);
          setTurmasAutorizadas(rc.turmas_autorizadas || []);
          setAtivo(rc.ativo);
        }
        if (blocosRes.data) {
          setBlocos(blocosRes.data.map((b: any) => ({
            localId: uuidv4(),
            dbId: b.id,
            tipo: b.tipo as TipoBloco,
            ordem: b.ordem,
            visivel: b.visivel,
            conteudo: b.conteudo,
          })));
        }
      } finally {
        setInitialLoading(false);
      }
    };
    carregar();
  }, [editingId]);

  // Ao trocar o modo (só em criação), carrega os blocos padrão do modo
  const handleModoChange = (novoModo: string) => {
    setModoCorrecaoId(novoModo);
    if (editingId) return; // em edição, não substitui blocos
    const modo = modosCorrecao.find(m => m.id === novoModo);
    if (!modo) return;
    setBlocos(
      modo.blocos_padrao.map((bp, idx) => ({
        localId: uuidv4(),
        tipo: bp.tipo,
        ordem: idx + 1,
        visivel: bp.visivel,
        conteudo: conteudoPadrao(bp.tipo),
      }))
    );
  };

  // Carrega blocos padrão quando os modos chegam (criação inicial)
  useEffect(() => {
    if (editingId || modosCorrecao.length === 0 || blocos.length > 0) return;
    const modo = modosCorrecao.find(m => m.id === modoCorrecaoId);
    if (!modo) return;
    setBlocos(
      modo.blocos_padrao.map((bp, idx) => ({
        localId: uuidv4(),
        tipo: bp.tipo,
        ordem: idx + 1,
        visivel: bp.visivel,
        conteudo: conteudoPadrao(bp.tipo),
      }))
    );
  }, [modosCorrecao]);

  // Texto original (para o editor de trechos)
  const textoOriginal = blocos.find(b => b.tipo === 'texto_original')?.conteudo?.texto || '';

  const handleToggleTurma = (turma: string) => {
    setTurmasAutorizadas(prev =>
      prev.includes(turma) ? prev.filter(t => t !== turma) : [...prev, turma]
    );
  };

  const handleBlocoConteudoChange = (localId: string, conteudo: any) => {
    setBlocos(prev => prev.map(b => b.localId === localId ? { ...b, conteudo } : b));
  };

  const handleToggleVisivel = (localId: string) => {
    setBlocos(prev => prev.map(b => b.localId === localId ? { ...b, visivel: !b.visivel } : b));
  };

  const handleMoverBloco = (localId: string, direcao: 'up' | 'down') => {
    setBlocos(prev => {
      const idx = prev.findIndex(b => b.localId === localId);
      if (idx < 0) return prev;
      const alvo = direcao === 'up' ? idx - 1 : idx + 1;
      if (alvo < 0 || alvo >= prev.length) return prev;
      const novo = [...prev];
      [novo[idx], novo[alvo]] = [novo[alvo], novo[idx]];
      return novo.map((b, i) => ({ ...b, ordem: i + 1 }));
    });
  };

  const handleRemoverBloco = (localId: string) => {
    setBlocos(prev => prev.filter(b => b.localId !== localId).map((b, i) => ({ ...b, ordem: i + 1 })));
  };

  const handleAdicionarBloco = () => {
    const novoBloco: Bloco = {
      localId: uuidv4(),
      tipo: tipoParaAdicionar,
      ordem: blocos.length + 1,
      visivel: true,
      conteudo: conteudoPadrao(tipoParaAdicionar),
    };
    setBlocos(prev => [...prev, novoBloco]);
  };

  const handleSalvar = async () => {
    if (!titulo.trim()) {
      toast.error('O título é obrigatório');
      setActiveSection('info');
      return;
    }
    if (turmasAutorizadas.length === 0) {
      toast.error('Selecione ao menos uma turma autorizada');
      setActiveSection('info');
      return;
    }

    setLoading(true);
    try {
      let rcId = editingId;

      const payload: any = {
        titulo: titulo.trim(),
        modo_correcao_id: modoCorrecaoId,
        turmas_autorizadas: turmasAutorizadas,
        ativo,
        atualizado_em: new Date().toISOString(),
      };

      if (ativo && !editingId) {
        payload.publicado_em = new Date().toISOString();
      }

      if (editingId) {
        // Buscar publicado_em existente para não sobrescrever
        const { data: existing } = await supabase
          .from('redacoes_comentadas')
          .select('publicado_em, ativo')
          .eq('id', editingId)
          .single();
        if (ativo && !existing?.publicado_em) {
          payload.publicado_em = new Date().toISOString();
        }
        const { error } = await supabase.from('redacoes_comentadas').update(payload).eq('id', editingId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from('redacoes_comentadas')
          .insert({ ...payload, criado_em: new Date().toISOString() })
          .select('id')
          .single();
        if (error) throw error;
        rcId = (data as any).id;
      }

      // Salvar blocos: delete-all então re-insert
      await supabase.from('redacao_comentada_blocos').delete().eq('redacao_comentada_id', rcId);

      if (blocos.length > 0) {
        const blocosParaInserir = blocos.map((b, idx) => ({
          redacao_comentada_id: rcId,
          tipo: b.tipo,
          ordem: idx + 1,
          visivel: b.visivel,
          conteudo: b.conteudo,
          criado_em: new Date().toISOString(),
        }));
        const { error: blocoError } = await supabase
          .from('redacao_comentada_blocos')
          .insert(blocosParaInserir);
        if (blocoError) throw blocoError;
      }

      await queryClient.invalidateQueries({ queryKey: ['admin-redacoes-comentadas'] });
      toast.success(editingId ? 'Redação comentada atualizada' : 'Redação comentada criada');
      onSuccess();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Erro ao salvar redação comentada');
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const turmasAlunos = TURMAS_VALIDAS as string[];

  return (
    <div className="space-y-4">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={onCancel} className="h-8 w-8 p-0">
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <h2 className="text-xl font-bold">
            {editingId ? 'Editar Redação Comentada' : 'Nova Redação Comentada'}
          </h2>
        </div>
        <Button onClick={handleSalvar} disabled={loading} className="gap-2">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Salvar
        </Button>
      </div>

      {/* Abas de navegação */}
      <div className="flex gap-1 border-b">
        {(['info', 'blocos'] as const).map((sec) => (
          <button
            key={sec}
            onClick={() => setActiveSection(sec)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              activeSection === sec
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {sec === 'info' ? 'Informações' : `Blocos (${blocos.length})`}
          </button>
        ))}
      </div>

      {/* Seção: Informações */}
      {activeSection === 'info' && (
        <div className="space-y-4">
          <div>
            <Label htmlFor="titulo">Título *</Label>
            <Input
              id="titulo"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder="Ex.: Redação nota 1000 – Análise ENEM 2023"
              className="mt-1"
            />
          </div>

          <div>
            <Label>Modo de Correção *</Label>
            <Select value={modoCorrecaoId} onValueChange={handleModoChange}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {modosCorrecao.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {modosCorrecao.find(m => m.id === modoCorrecaoId)?.descricao && (
              <p className="text-xs text-muted-foreground mt-1">
                {modosCorrecao.find(m => m.id === modoCorrecaoId)?.descricao}
              </p>
            )}
          </div>

          <div>
            <Label>Turmas Autorizadas *</Label>
            <p className="text-xs text-muted-foreground mb-2">
              Selecione quais turmas de alunos e/ou professores podem visualizar esta redação.
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
              {turmasAlunos.map((t) => (
                <label key={t} className="flex items-center gap-2 cursor-pointer text-sm">
                  <Checkbox
                    checked={turmasAutorizadas.includes(t)}
                    onCheckedChange={() => handleToggleTurma(t)}
                  />
                  <span>Turma {t}</span>
                </label>
              ))}
            </div>
            {turmasProfessores.length > 0 && (
              <>
                <p className="text-xs text-muted-foreground mt-3 mb-2">Turmas de professores:</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                  {turmasProfessores.map((tp) => (
                    <label key={tp.id} className="flex items-center gap-2 cursor-pointer text-sm">
                      <Checkbox
                        checked={turmasAutorizadas.includes(tp.nome)}
                        onCheckedChange={() => handleToggleTurma(tp.nome)}
                      />
                      <span>{tp.nome}</span>
                    </label>
                  ))}
                </div>
              </>
            )}
          </div>

          <div className="flex items-center gap-3">
            <Switch checked={ativo} onCheckedChange={setAtivo} />
            <div>
              <Label>Publicado</Label>
              <p className="text-xs text-muted-foreground">
                {ativo ? 'Visível para alunos e professores autorizados' : 'Oculto (rascunho)'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Seção: Blocos */}
      {activeSection === 'blocos' && (
        <div className="space-y-3">
          {blocos.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-6">
              Nenhum bloco adicionado. Use o seletor abaixo para adicionar blocos.
            </p>
          )}

          {blocos.map((bloco, idx) => (
            <Card key={bloco.localId} className={!bloco.visivel ? 'opacity-50' : ''}>
              <CardHeader className="py-2 px-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-muted-foreground w-5 text-center">
                      {idx + 1}
                    </span>
                    <CardTitle className="text-sm">{TIPO_LABELS[bloco.tipo]}</CardTitle>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0"
                      disabled={idx === 0}
                      onClick={() => handleMoverBloco(bloco.localId, 'up')}
                    >
                      <ChevronUp className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0"
                      disabled={idx === blocos.length - 1}
                      onClick={() => handleMoverBloco(bloco.localId, 'down')}
                    >
                      <ChevronDown className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0"
                      onClick={() => handleToggleVisivel(bloco.localId)}
                      title={bloco.visivel ? 'Ocultar bloco' : 'Mostrar bloco'}
                    >
                      {bloco.visivel ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 text-destructive"
                      onClick={() => handleRemoverBloco(bloco.localId)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="px-3 pb-3">
                <BlocoEditor
                  bloco={bloco}
                  textoOriginal={textoOriginal}
                  onChange={handleBlocoConteudoChange}
                />
              </CardContent>
            </Card>
          ))}

          {/* Adicionar bloco */}
          <div className="flex gap-2 items-center border-t pt-3 mt-3">
            <Select value={tipoParaAdicionar} onValueChange={(v) => setTipoParaAdicionar(v as TipoBloco)}>
              <SelectTrigger className="flex-1 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TODOS_TIPOS.map((t) => (
                  <SelectItem key={t} value={t} className="text-sm">{TIPO_LABELS[t]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={handleAdicionarBloco} className="shrink-0 gap-1.5">
              <Plus className="w-4 h-4" />
              Adicionar bloco
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
