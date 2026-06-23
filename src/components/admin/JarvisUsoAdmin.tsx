import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  ChevronDown, ChevronUp, Clock, MessageSquare,
  Search, Star, Trash2, Bot, Zap,
} from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';

// ─── Tipos ──────────────────────────────────────────────────────

type Origem = 'sessao_tutor' | 'interacao_legada';

interface Habilidade {
  label: string;
  nivel: 'verde' | 'amarelo' | 'vermelho';
}

interface RegistroUnificado {
  id: string;
  origem: Origem;
  user_id: string | null;
  aluno_email: string;
  aluno_nome: string | null;
  turma: string | null;
  assunto_ou_modo: string | null;
  created_at: string;
  deleted_by_aluno: boolean;
  // Sessão Tutor
  resumo: string | null;
  pontos_positivos: string | null;
  dificuldades: string[];
  tags_dificuldades: string[];
  proximos_passos: string[];
  orientacao_professor: string | null;
  habilidades: Habilidade[];
  duracao_minutos: number | null;
  total_mensagens: number | null;
  avaliacao_aluno: number | null;
  conversa_id: string | null;
  // Interação Legada
  texto_original: string | null;
  diagnostico: string | null;
  versao_melhorada: string | null;
  palavras_original: number | null;
  creditos_consumidos: number | null;
}

// ─── Helpers ────────────────────────────────────────────────────

const SUBTAB_LABEL: Record<string, string> = {
  introducao:    'Introdução',
  desenvolvimento: 'Desenvolvimento',
  conclusao:     'Conclusão',
  analisar:      'Analisar Texto',
  melhorar:      'Melhorar Texto',
  repertorio:    'Repertório',
  gramatica:     'Gramática',
};

const MESES = [
  { v: 1, l: 'Janeiro' },  { v: 2,  l: 'Fevereiro' }, { v: 3,  l: 'Março' },
  { v: 4, l: 'Abril' },    { v: 5,  l: 'Maio' },       { v: 6,  l: 'Junho' },
  { v: 7, l: 'Julho' },    { v: 8,  l: 'Agosto' },     { v: 9,  l: 'Setembro' },
  { v: 10, l: 'Outubro' }, { v: 11, l: 'Novembro' },   { v: 12, l: 'Dezembro' },
];

function formatData(d: string) {
  return format(new Date(d), "dd/MM/yyyy HH:mm", { locale: ptBR });
}

function humanizarParaTerceiraPessoa(texto: string, nome: string | null): string {
  const ref  = nome ? nome.split(' ')[0] : 'O aluno';
  const refl = ref.toLowerCase();
  const nL = '(?<![a-zA-ZÀ-ÿ])';
  const nR = '(?![a-zA-ZÀ-ÿ])';
  return texto
    .replace(new RegExp(`${nL}Você${nR}`, 'g'), ref)
    .replace(new RegExp(`${nL}você${nR}`, 'g'), refl)
    .replace(new RegExp(`${nL}Seu${nR}`, 'g'),  `de ${ref}`)
    .replace(new RegExp(`${nL}seu${nR}`, 'g'),  `de ${refl}`)
    .replace(new RegExp(`${nL}Sua${nR}`, 'g'),  `de ${ref}`)
    .replace(new RegExp(`${nL}sua${nR}`, 'g'),  `de ${refl}`);
}

function labelAssunto(r: RegistroUnificado): string {
  if (!r.assunto_ou_modo) return 'Livre';
  return SUBTAB_LABEL[r.assunto_ou_modo] ?? r.assunto_ou_modo;
}

// ─── Badge de origem ────────────────────────────────────────────

function OrigemBadge({ origem }: { origem: Origem }) {
  if (origem === 'sessao_tutor') {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-violet-100 text-violet-700 border border-violet-200">
        <Bot className="w-2.5 h-2.5" />TUTOR
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-500 border border-slate-200">
      <Zap className="w-2.5 h-2.5" />MODO
    </span>
  );
}

// ─── Expand: Sessão Tutor ────────────────────────────────────────

function SessaoTutorExpand({ r }: { r: RegistroUnificado }) {
  const nome = r.aluno_nome ?? null;
  return (
    <div className="px-6 py-5 bg-violet-50/40">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {r.resumo && (
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
              O que foi estudado
            </p>
            <p className="text-sm text-slate-700 leading-relaxed">
              {humanizarParaTerceiraPessoa(r.resumo, nome)}
            </p>
          </div>
        )}
        {r.pontos_positivos && (
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-green-500 mb-1.5">
              Pontos positivos
            </p>
            <p className="text-sm text-slate-700 leading-relaxed">
              {humanizarParaTerceiraPessoa(r.pontos_positivos, nome)}
            </p>
          </div>
        )}
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-red-400 mb-1.5">
            Dificuldades identificadas
          </p>
          {(r.dificuldades ?? []).length > 0 ? (
            <ul className="space-y-1">
              {r.dificuldades.map((d, i) => (
                <li key={i} className="text-sm text-slate-700 flex gap-2">
                  <span className="text-red-400 flex-shrink-0">•</span>
                  {humanizarParaTerceiraPessoa(d, nome)}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-slate-400 italic">Nenhuma dificuldade identificada.</p>
          )}
        </div>
      </div>

      {(r.tags_dificuldades ?? []).length > 0 && (
        <div className="mt-4 pt-4 border-t border-violet-100">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
            Tags (base para PEP)
          </p>
          <div className="flex flex-wrap gap-1">
            {r.tags_dificuldades.map(t => (
              <span
                key={t}
                className="text-[10px] px-2 py-0.5 rounded-full bg-white text-slate-600 border border-slate-200"
              >
                {t}
              </span>
            ))}
          </div>
        </div>
      )}

      {r.orientacao_professor && (
        <div className="mt-4 pt-4 border-t border-violet-100">
          <p className="text-[10px] font-bold uppercase tracking-wider text-indigo-400 mb-1.5">
            Orientação ao professor
          </p>
          <p className="text-sm text-slate-700 leading-relaxed italic">
            {r.orientacao_professor}
          </p>
        </div>
      )}

      {r.deleted_by_aluno && (
        <p className="mt-3 text-[11px] text-amber-600 font-medium">
          ⚠ Este registro foi ocultado pelo aluno no próprio histórico.
        </p>
      )}
    </div>
  );
}

// ─── Expand: Interação Legada ────────────────────────────────────

function InteracaoLegadaExpand({ r }: { r: RegistroUnificado }) {
  const [expandirTexto, setExpandirTexto] = useState(false);
  const texto = r.texto_original ?? '';
  const LIMITE = 300;

  return (
    <div className="px-6 py-5 bg-slate-50">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {texto && (
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
              Texto original · {r.palavras_original ?? 0} palavras
            </p>
            <p className="text-sm text-slate-700 leading-relaxed">
              {expandirTexto || texto.length <= LIMITE
                ? texto
                : texto.slice(0, LIMITE) + '...'}
            </p>
            {texto.length > LIMITE && (
              <button
                onClick={() => setExpandirTexto(v => !v)}
                className="text-xs text-indigo-500 hover:text-indigo-700 mt-1 underline"
              >
                {expandirTexto ? 'Recolher' : 'Exibir completo'}
              </button>
            )}
          </div>
        )}

        <div className="space-y-4">
          {r.diagnostico && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                Diagnóstico
              </p>
              <p className="text-sm text-slate-700 leading-relaxed">{r.diagnostico}</p>
            </div>
          )}
          {r.versao_melhorada && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                Versão melhorada
              </p>
              <p className="text-sm text-slate-600 leading-relaxed italic">{r.versao_melhorada}</p>
            </div>
          )}
        </div>
      </div>

      <div className="mt-3 pt-3 border-t border-slate-200 flex gap-4 text-xs text-slate-400">
        {r.assunto_ou_modo && (
          <span>Modo: <strong className="text-slate-600">{r.assunto_ou_modo}</strong></span>
        )}
        {r.creditos_consumidos != null && (
          <span>Crédito consumido: <strong className="text-slate-600">{r.creditos_consumidos}</strong></span>
        )}
      </div>
    </div>
  );
}

// ─── Linha da tabela ─────────────────────────────────────────────

interface RowProps {
  registro: RegistroUnificado;
  selected: boolean;
  onToggle: (id: string) => void;
  onDelete: (r: RegistroUnificado) => void;
}

function RegistroRow({ registro: r, selected, onToggle, onDelete }: RowProps) {
  const [expandido, setExpandido] = useState(false);
  const isTutor = r.origem === 'sessao_tutor';

  return (
    <>
      <tr className={cn('border-b text-sm', selected ? 'bg-red-50' : 'hover:bg-slate-50/70')}>
        {/* Checkbox */}
        <td className="px-3 py-3 w-10" onClick={e => e.stopPropagation()}>
          <Checkbox checked={selected} onCheckedChange={() => onToggle(r.id)} />
        </td>

        {/* Badge de origem */}
        <td className="px-3 py-3 w-20">
          <OrigemBadge origem={r.origem} />
        </td>

        {/* Aluno */}
        <td
          className="px-4 py-3 cursor-pointer min-w-[160px]"
          onClick={() => setExpandido(v => !v)}
        >
          <div className="font-medium text-slate-800">{r.aluno_nome || '—'}</div>
          <div className="text-xs text-slate-400 truncate max-w-[180px]">{r.aluno_email}</div>
        </td>

        {/* Turma */}
        <td className="px-4 py-3 cursor-pointer" onClick={() => setExpandido(v => !v)}>
          {r.turma
            ? <Badge variant="outline" className="text-xs">{r.turma}</Badge>
            : <span className="text-slate-300 text-xs">—</span>
          }
        </td>

        {/* Assunto / Modo */}
        <td className="px-4 py-3 cursor-pointer" onClick={() => setExpandido(v => !v)}>
          <span className={cn(
            'text-xs px-2 py-0.5 rounded-md font-medium',
            isTutor
              ? 'bg-violet-50 text-violet-700 border border-violet-100'
              : 'bg-slate-100 text-slate-600 border border-slate-200',
          )}>
            {labelAssunto(r)}
          </span>
        </td>

        {/* Data */}
        <td
          className="px-4 py-3 text-xs text-slate-500 cursor-pointer whitespace-nowrap"
          onClick={() => setExpandido(v => !v)}
        >
          {formatData(r.created_at)}
        </td>

        {/* Duração (só sessão tutor) */}
        <td className="px-4 py-3 cursor-pointer" onClick={() => setExpandido(v => !v)}>
          {isTutor && (r.duracao_minutos || r.total_mensagens) ? (
            <div className="flex items-center gap-2 text-xs text-slate-500">
              {(r.duracao_minutos ?? 0) > 0 && (
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />{r.duracao_minutos}min
                </span>
              )}
              {(r.total_mensagens ?? 0) > 0 && (
                <span className="flex items-center gap-1">
                  <MessageSquare className="w-3 h-3" />{r.total_mensagens}
                </span>
              )}
            </div>
          ) : (
            <span className="text-slate-300 text-xs">—</span>
          )}
        </td>

        {/* Nota (só sessão tutor) */}
        <td className="px-4 py-3 cursor-pointer" onClick={() => setExpandido(v => !v)}>
          {isTutor && r.avaliacao_aluno ? (
            <div className="flex gap-0.5">
              {[1,2,3,4,5].map(s => (
                <Star
                  key={s}
                  className={cn(
                    'w-3.5 h-3.5',
                    s <= r.avaliacao_aluno!
                      ? 'fill-amber-400 text-amber-400'
                      : 'fill-slate-200 text-slate-200',
                  )}
                />
              ))}
            </div>
          ) : (
            <span className="text-slate-300 text-xs">—</span>
          )}
        </td>

        {/* Ações */}
        <td className="px-3 py-3 w-16" onClick={e => e.stopPropagation()}>
          <div className="flex items-center gap-0.5">
            <button
              onClick={() => onDelete(r)}
              className="p-1.5 rounded hover:bg-red-100 text-slate-300 hover:text-red-600 transition-colors"
              title="Deletar registro"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setExpandido(v => !v)}
              className="p-1.5 rounded hover:bg-slate-100 text-slate-300 hover:text-slate-600 transition-colors"
            >
              {expandido
                ? <ChevronUp className="w-4 h-4" />
                : <ChevronDown className="w-4 h-4" />
              }
            </button>
          </div>
        </td>
      </tr>

      {/* Painel expandido */}
      {expandido && (
        <tr className={cn('border-b', selected ? 'bg-red-50' : '')}>
          <td colSpan={9} className="p-0">
            {isTutor
              ? <SessaoTutorExpand r={r} />
              : <InteracaoLegadaExpand r={r} />
            }
          </td>
        </tr>
      )}
    </>
  );
}

// ─── Componente principal ────────────────────────────────────────

const PAGE_SIZE = 50;

export function JarvisUsoAdmin() {
  const now = new Date();
  const [mes,          setMes]          = useState(now.getMonth() + 1);
  const [ano,          setAno]          = useState(now.getFullYear());
  const [turmaFiltro,  setTurmaFiltro]  = useState('todas');
  const [origemFiltro, setOrigemFiltro] = useState<'todas' | Origem>('todas');
  const [busca,        setBusca]        = useState('');

  // Dados
  const [todos,      setTodos]      = useState<RegistroUnificado[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [paginaAtual, setPaginaAtual] = useState(0);

  // Seleção e delete
  const [selectedIds,   setSelectedIds]   = useState<Set<string>>(new Set());
  const [confirmDelete, setConfirmDelete] = useState<RegistroUnificado[] | null>(null);
  const [deletando,     setDeletando]     = useState(false);

  const anos = [now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1];

  // ── Carga ──────────────────────────────────────────────────────
  const carregar = useCallback(async () => {
    setLoading(true);
    setSelectedIds(new Set());
    setPaginaAtual(0);
    try {
      const inicio = new Date(ano, mes - 1, 1).toISOString();
      const fim    = new Date(ano, mes, 0, 23, 59, 59).toISOString();

      let q = (supabase as any)
        .from('jarvis_uso_unificado')
        .select('*')
        .gte('created_at', inicio)
        .lte('created_at', fim)
        .order('created_at', { ascending: false });

      if (turmaFiltro  !== 'todas') q = q.eq('turma',  turmaFiltro);
      if (origemFiltro !== 'todas') q = q.eq('origem', origemFiltro);

      const { data, error } = await q;
      if (error) throw error;
      setTodos((data ?? []) as RegistroUnificado[]);
    } catch (err) {
      console.error('JarvisUsoAdmin carregar:', err);
    } finally {
      setLoading(false);
    }
  }, [mes, ano, turmaFiltro, origemFiltro]);

  useEffect(() => { carregar(); }, [carregar]);

  // ── Filtro client-side (busca) + paginação virtual ─────────────
  const filtrados = busca.trim()
    ? todos.filter(r => {
        const b = busca.toLowerCase();
        return (r.aluno_nome ?? '').toLowerCase().includes(b)
            || r.aluno_email.toLowerCase().includes(b);
      })
    : todos;

  const paginaFim   = (paginaAtual + 1) * PAGE_SIZE;
  const visiveis    = filtrados.slice(0, paginaFim);
  const temMais     = filtrados.length > paginaFim;

  // Contadores de origem
  const nTutor     = todos.filter(r => r.origem === 'sessao_tutor').length;
  const nInteracao = todos.filter(r => r.origem === 'interacao_legada').length;

  // Turmas disponíveis nos dados carregados
  const turmas = [...new Set(todos.map(r => r.turma).filter(Boolean))] as string[];

  // ── Seleção ─────────────────────────────────────────────────────
  const toggleSelect  = (id: string) => setSelectedIds(prev => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });

  const todosSelecionados =
    visiveis.length > 0 && visiveis.every(r => selectedIds.has(r.id));

  const toggleTodos = () => {
    if (todosSelecionados) {
      setSelectedIds(prev => {
        const next = new Set(prev);
        visiveis.forEach(r => next.delete(r.id));
        return next;
      });
    } else {
      setSelectedIds(prev => {
        const next = new Set(prev);
        visiveis.forEach(r => next.add(r.id));
        return next;
      });
    }
  };

  // ── Delete — aponta explicitamente para a tabela de origem ──────
  const executarDelete = async (registros: RegistroUnificado[]) => {
    setDeletando(true);
    try {
      const sessoes    = registros.filter(r => r.origem === 'sessao_tutor').map(r => r.id);
      const interacoes = registros.filter(r => r.origem === 'interacao_legada').map(r => r.id);

      if (sessoes.length) {
        const { error } = await (supabase as any)
          .from('jarvis_sessoes_sintetizadas')
          .delete()
          .in('id', sessoes);
        if (error) throw error;
      }
      if (interacoes.length) {
        const { error } = await supabase
          .from('jarvis_interactions')
          .delete()
          .in('id', interacoes);
        if (error) throw error;
      }
      setConfirmDelete(null);
      setSelectedIds(new Set());
      await carregar();
    } catch (err) {
      console.error('JarvisUsoAdmin delete:', err);
    } finally {
      setDeletando(false);
    }
  };

  const selecionadosList = Array.from(selectedIds)
    .map(id => todos.find(r => r.id === id))
    .filter(Boolean) as RegistroUnificado[];

  // ── Render ──────────────────────────────────────────────────────
  return (
    <div className="space-y-4">

      {/* Filtros estruturais */}
      <div className="flex flex-wrap gap-3 items-center">
        {/* Mês */}
        <Select value={mes.toString()} onValueChange={v => setMes(Number(v))}>
          <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            {MESES.map(m => <SelectItem key={m.v} value={m.v.toString()}>{m.l}</SelectItem>)}
          </SelectContent>
        </Select>

        {/* Ano */}
        <Select value={ano.toString()} onValueChange={v => setAno(Number(v))}>
          <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
          <SelectContent>
            {anos.map(a => <SelectItem key={a} value={a.toString()}>{a}</SelectItem>)}
          </SelectContent>
        </Select>

        {/* Turma */}
        <Select value={turmaFiltro} onValueChange={v => { setTurmaFiltro(v); setBusca(''); }}>
          <SelectTrigger className="w-44"><SelectValue placeholder="Turma" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Todas as turmas</SelectItem>
            {turmas.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
          </SelectContent>
        </Select>

        {/* Origem */}
        <Select value={origemFiltro} onValueChange={v => { setOrigemFiltro(v as any); setBusca(''); }}>
          <SelectTrigger className="w-52"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Todas as origens</SelectItem>
            <SelectItem value="sessao_tutor">Sessões Tutor</SelectItem>
            <SelectItem value="interacao_legada">Interações Legadas</SelectItem>
          </SelectContent>
        </Select>

        {/* Busca */}
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
          <Input
            value={busca}
            onChange={e => { setBusca(e.target.value); setPaginaAtual(0); }}
            placeholder="Buscar aluno..."
            className="pl-9"
          />
        </div>
      </div>

      {/* Contadores + ações em lote */}
      <div className="flex items-center gap-3 flex-wrap">
        {!loading && (
          <span className="text-sm text-slate-500">
            {filtrados.length} {filtrados.length === 1 ? 'registro' : 'registros'}
            {origemFiltro === 'todas' && todos.length > 0 && (
              <span className="text-slate-400">
                {' · '}
                <span className="text-violet-500 font-medium">{nTutor} sessões Tutor</span>
                {' · '}
                <span className="text-slate-500">{nInteracao} interações legadas</span>
              </span>
            )}
          </span>
        )}

        {selecionadosList.length > 0 && (
          <Button
            variant="destructive"
            size="sm"
            onClick={() => setConfirmDelete(selecionadosList)}
            className="gap-2"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Deletar {selecionadosList.length} selecionado{selecionadosList.length > 1 ? 's' : ''}
          </Button>
        )}
      </div>

      {/* Tabela */}
      <div className="rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-3 py-3 w-10">
                <Checkbox
                  checked={todosSelecionados}
                  onCheckedChange={toggleTodos}
                  aria-label="Selecionar visíveis"
                />
              </th>
              <th className="px-3 py-3 w-20 text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                Tipo
              </th>
              <th className="px-4 py-3 text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                Aluno
              </th>
              <th className="px-4 py-3 text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                Turma
              </th>
              <th className="px-4 py-3 text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                Assunto / Modo
              </th>
              <th className="px-4 py-3 text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                Data
              </th>
              <th className="px-4 py-3 text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                Duração
              </th>
              <th className="px-4 py-3 text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                Nota
              </th>
              <th className="px-3 py-3 w-16" />
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={9} className="px-4 py-10 text-center text-slate-400 text-sm">
                  Carregando...
                </td>
              </tr>
            ) : visiveis.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-4 py-10 text-center text-slate-400 text-sm">
                  {busca ? 'Nenhum resultado para a busca.' : 'Nenhum registro neste período.'}
                </td>
              </tr>
            ) : (
              visiveis.map(r => (
                <RegistroRow
                  key={r.id}
                  registro={r}
                  selected={selectedIds.has(r.id)}
                  onToggle={toggleSelect}
                  onDelete={reg => setConfirmDelete([reg])}
                />
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Carregar mais */}
      {temMais && (
        <div className="flex justify-center pt-1">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPaginaAtual(p => p + 1)}
            className="gap-2"
          >
            Carregar mais {Math.min(PAGE_SIZE, filtrados.length - paginaFim)} registros
            <span className="text-xs text-slate-400">
              ({visiveis.length} de {filtrados.length} carregados)
            </span>
          </Button>
        </div>
      )}

      {/* Dialog de confirmação de delete */}
      <AlertDialog
        open={!!confirmDelete}
        onOpenChange={open => { if (!open && !deletando) setConfirmDelete(null); }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Deletar {confirmDelete?.length === 1 ? 'registro' : `${confirmDelete?.length} registros`}?
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2 text-sm text-slate-600">
                <p>Esta ação é permanente e não pode ser desfeita.</p>
                {confirmDelete && confirmDelete.length > 0 && (() => {
                  const s = confirmDelete.filter(r => r.origem === 'sessao_tutor').length;
                  const i = confirmDelete.filter(r => r.origem === 'interacao_legada').length;
                  return (
                    <div className="flex gap-3 pt-1">
                      {s > 0 && (
                        <span className="text-xs px-2 py-1 rounded bg-violet-50 text-violet-700 border border-violet-100">
                          {s} sessão{s > 1 ? 'ões' : ''} Tutor
                        </span>
                      )}
                      {i > 0 && (
                        <span className="text-xs px-2 py-1 rounded bg-slate-100 text-slate-600 border border-slate-200">
                          {i} interação{i > 1 ? 'ões' : ''} legada{i > 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                  );
                })()}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletando}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              disabled={deletando}
              onClick={() => confirmDelete && executarDelete(confirmDelete)}
            >
              {deletando ? 'Deletando...' : 'Deletar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
