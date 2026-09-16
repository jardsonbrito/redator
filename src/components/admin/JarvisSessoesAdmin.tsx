import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ChevronDown, ChevronUp, Clock, MessageSquare, Search, Star, Trash2 } from 'lucide-react';
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

function humanizarParaTerceiraPessoa(texto: string, nome: string | null): string {
  const ref  = nome ? nome.split(' ')[0] : 'O aluno';
  const refl = ref.toLowerCase();
  // \b não funciona com caracteres acentuados (ê, ã) — usamos lookahead/lookbehind de letras
  const naoLetra = '(?<![a-zA-ZÀ-ÿ])';
  const naoLetraF = '(?![a-zA-ZÀ-ÿ])';
  return texto
    .replace(new RegExp(`${naoLetra}Você${naoLetraF}`, 'g'), ref)
    .replace(new RegExp(`${naoLetra}você${naoLetraF}`, 'g'), refl)
    .replace(new RegExp(`${naoLetra}Seu${naoLetraF}`, 'g'),  `de ${ref}`)
    .replace(new RegExp(`${naoLetra}seu${naoLetraF}`, 'g'),  `de ${refl}`)
    .replace(new RegExp(`${naoLetra}Sua${naoLetraF}`, 'g'),  `de ${ref}`)
    .replace(new RegExp(`${naoLetra}sua${naoLetraF}`, 'g'),  `de ${refl}`);
}

interface Sessao {
  id: string;
  aluno_email: string;
  aluno_nome?: string | null;
  turma: string | null;
  subtab_nome: string | null;
  resumo: string | null;
  pontos_positivos?: string | null;
  avaliacao_aluno?: number | null;
  habilidades: Array<{ label: string; nivel: string }>;
  dificuldades: string[];
  proximos_passos: string[];
  orientacao_professor: string | null;
  duracao_minutos: number;
  total_mensagens: number;
  exercicios_estimados: number;
  texto_completo: string;
  tags_dificuldades: string[];
  created_at: string;
}

const SUBTAB_LABEL: Record<string, string> = {
  introducao: 'Introdução', desenvolvimento: 'Desenvolvimento', conclusao: 'Conclusão',
  analisar: 'Analisar Texto', melhorar: 'Melhorar Texto',
  repertorio: 'Repertório', gramatica: 'Gramática',
};

interface SessaoRowProps {
  sessao: Sessao;
  selected: boolean;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
}

function SessaoRow({ sessao, selected, onToggle, onDelete }: SessaoRowProps) {
  const [expandida, setExpandida] = useState(false);

  return (
    <>
      <tr className={cn('border-b', selected ? 'bg-red-50' : 'hover:bg-slate-50')}>
        {/* Checkbox */}
        <td className="px-3 py-3" onClick={e => e.stopPropagation()}>
          <Checkbox
            checked={selected}
            onCheckedChange={() => onToggle(sessao.id)}
          />
        </td>

        {/* Dados — clicável para expandir */}
        <td className="px-4 py-3 cursor-pointer" onClick={() => setExpandida(v => !v)}>
          <div className="font-medium text-sm text-slate-800">{sessao.aluno_nome || sessao.aluno_email}</div>
          <div className="text-xs text-slate-400">{sessao.aluno_email}</div>
        </td>
        <td className="px-4 py-3 text-xs text-slate-500 cursor-pointer" onClick={() => setExpandida(v => !v)}>{sessao.turma ?? '—'}</td>
        <td className="px-4 py-3 cursor-pointer" onClick={() => setExpandida(v => !v)}>
          <Badge variant="outline" className="text-xs">
            {sessao.subtab_nome ? (SUBTAB_LABEL[sessao.subtab_nome] ?? sessao.subtab_nome) : 'Livre'}
          </Badge>
        </td>
        <td className="px-4 py-3 text-xs text-slate-500 cursor-pointer" onClick={() => setExpandida(v => !v)}>
          {format(new Date(sessao.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
        </td>
        <td className="px-4 py-3 cursor-pointer" onClick={() => setExpandida(v => !v)}>
          <div className="flex items-center gap-2 text-xs text-slate-500">
            {sessao.duracao_minutos > 0 && (
              <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{sessao.duracao_minutos}min</span>
            )}
            {sessao.total_mensagens > 0 && (
              <span className="flex items-center gap-1"><MessageSquare className="w-3 h-3" />{sessao.total_mensagens}</span>
            )}
          </div>
        </td>
        {/* Nota do aluno */}
        <td className="px-4 py-3 cursor-pointer" onClick={() => setExpandida(v => !v)}>
          {sessao.avaliacao_aluno ? (
            <div className="flex gap-0.5">
              {[1,2,3,4,5].map(s => (
                <Star key={s} className={cn('w-3.5 h-3.5', s <= sessao.avaliacao_aluno! ? 'fill-amber-400 text-amber-400' : 'fill-slate-200 text-slate-200')} />
              ))}
            </div>
          ) : (
            <span className="text-xs text-slate-300">—</span>
          )}
        </td>

        {/* Ações */}
        <td className="px-3 py-3" onClick={e => e.stopPropagation()}>
          <div className="flex items-center gap-1">
            <button
              onClick={() => onDelete(sessao.id)}
              className="p-1.5 rounded hover:bg-red-100 text-slate-400 hover:text-red-600 transition-colors"
              title="Deletar sessão"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
            <button onClick={() => setExpandida(v => !v)} className="p-1.5 rounded hover:bg-slate-100">
              {expandida ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
            </button>
          </div>
        </td>
      </tr>

      {expandida && (
        <tr className={cn('border-b', selected ? 'bg-red-50' : 'bg-slate-50')}>
          <td colSpan={8} className="px-6 py-5">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {sessao.resumo && (
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">O que foi estudado</p>
                  <p className="text-sm text-slate-700 leading-relaxed">{humanizarParaTerceiraPessoa(sessao.resumo, sessao.aluno_nome ?? null)}</p>
                </div>
              )}
              {sessao.pontos_positivos && (
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-green-500 mb-1.5">Pontos positivos</p>
                  <p className="text-sm text-slate-700 leading-relaxed">{sessao.pontos_positivos}</p>
                </div>
              )}
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-red-400 mb-1.5">Dificuldades identificadas</p>
                {sessao.dificuldades.length > 0 ? (
                  <ul className="space-y-1">
                    {sessao.dificuldades.map((d, i) => (
                      <li key={i} className="text-sm text-slate-700 flex gap-2">
                        <span className="text-red-400 flex-shrink-0">•</span>
                        {humanizarParaTerceiraPessoa(d, sessao.aluno_nome ?? null)}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-slate-400 italic">Nenhuma dificuldade identificada.</p>
                )}
              </div>
            </div>
            {sessao.tags_dificuldades.length > 0 && (
              <div className="mt-4 pt-4 border-t border-slate-200">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Tags (base para PEP)</p>
                <div className="flex flex-wrap gap-1">
                  {sessao.tags_dificuldades.map(t => (
                    <span key={t} className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">{t}</span>
                  ))}
                </div>
              </div>
            )}
          </td>
        </tr>
      )}
    </>
  );
}

export function JarvisSessoesAdmin() {
  const now = new Date();
  const [mes,  setMes]  = useState(now.getMonth() + 1);
  const [ano,  setAno]  = useState(now.getFullYear());
  const [busca, setBusca] = useState('');
  const [turmaFiltro, setTurmaFiltro] = useState('todas');
  const [sessoes, setSessoes] = useState<Sessao[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [confirmDelete, setConfirmDelete] = useState<string[] | null>(null);

  const meses = [
    { v: 1, l: 'Janeiro' }, { v: 2, l: 'Fevereiro' }, { v: 3, l: 'Março' },
    { v: 4, l: 'Abril' },   { v: 5, l: 'Maio' },      { v: 6, l: 'Junho' },
    { v: 7, l: 'Julho' },   { v: 8, l: 'Agosto' },    { v: 9, l: 'Setembro' },
    { v: 10, l: 'Outubro' },{ v: 11, l: 'Novembro' }, { v: 12, l: 'Dezembro' },
  ];
  const anos = [now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1];

  const carregar = useCallback(async () => {
    setLoading(true);
    setSelectedIds(new Set());
    try {
      const inicio = new Date(ano, mes - 1, 1).toISOString();
      const fim    = new Date(ano, mes, 0, 23, 59, 59).toISOString();
      let query = (supabase as any)
        .from('jarvis_sessoes_sintetizadas').select('*')
        .gte('created_at', inicio).lte('created_at', fim)
        .order('created_at', { ascending: false });
      if (turmaFiltro !== 'todas') query = query.eq('turma', turmaFiltro);
      const { data } = await query;
      setSessoes(data ?? []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [mes, ano, turmaFiltro]);

  useEffect(() => { carregar(); }, [carregar]);

  const turmas = [...new Set(sessoes.map(s => s.turma).filter(Boolean))] as string[];

  const sessoesFiltradas = busca.trim()
    ? sessoes.filter(s =>
        s.aluno_email.toLowerCase().includes(busca.toLowerCase()) ||
        (s.aluno_nome ?? '').toLowerCase().includes(busca.toLowerCase())
      )
    : sessoes;

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedIds.size === sessoesFiltradas.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(sessoesFiltradas.map(s => s.id)));
    }
  };

  const executarDelete = async (ids: string[]) => {
    await (supabase as any).from('jarvis_sessoes_sintetizadas').delete().in('id', ids);
    setConfirmDelete(null);
    setSelectedIds(new Set());
    await carregar();
  };

  const allSelected = sessoesFiltradas.length > 0 && selectedIds.size === sessoesFiltradas.length;
  const someSelected = selectedIds.size > 0;

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <div className="flex flex-wrap gap-3 items-center">
        <Select value={mes.toString()} onValueChange={v => setMes(Number(v))}>
          <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
          <SelectContent>{meses.map(m => <SelectItem key={m.v} value={m.v.toString()}>{m.l}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={ano.toString()} onValueChange={v => setAno(Number(v))}>
          <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
          <SelectContent>{anos.map(a => <SelectItem key={a} value={a.toString()}>{a}</SelectItem>)}</SelectContent>
        </Select>
        {turmas.length > 0 && (
          <Select value={turmaFiltro} onValueChange={setTurmaFiltro}>
            <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas as turmas</SelectItem>
              {turmas.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
          <Input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar aluno..." className="pl-9" />
        </div>
        <span className="text-sm text-slate-500">{sessoesFiltradas.length} {sessoesFiltradas.length === 1 ? 'sessão' : 'sessões'}</span>

        {/* Botão deletar selecionados */}
        {someSelected && (
          <Button
            variant="destructive"
            size="sm"
            onClick={() => setConfirmDelete([...selectedIds])}
            className="gap-2"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Deletar {selectedIds.size} {selectedIds.size === 1 ? 'sessão' : 'sessões'}
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
                  checked={allSelected}
                  onCheckedChange={toggleAll}
                  aria-label="Selecionar todos"
                />
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Aluno</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Turma</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Assunto</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Data</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Duração</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Nota</th>
              <th className="px-4 py-3 w-20" />
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} className="px-4 py-8 text-center text-slate-400 text-sm">Carregando...</td></tr>
            ) : sessoesFiltradas.length === 0 ? (
              <tr><td colSpan={8} className="px-4 py-8 text-center text-slate-400 text-sm">Nenhuma sessão neste período.</td></tr>
            ) : (
              sessoesFiltradas.map(s => (
                <SessaoRow
                  key={s.id}
                  sessao={s}
                  selected={selectedIds.has(s.id)}
                  onToggle={toggleSelect}
                  onDelete={id => setConfirmDelete([id])}
                />
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Confirmação de delete */}
      <AlertDialog open={!!confirmDelete} onOpenChange={open => { if (!open) setConfirmDelete(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deletar {confirmDelete?.length === 1 ? 'sessão' : `${confirmDelete?.length} sessões`}?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação é permanente. {confirmDelete?.length === 1 ? 'A sessão' : 'As sessões'} e todos os dados pedagógicos serão excluídos do banco.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() => confirmDelete && executarDelete(confirmDelete)}
            >
              Deletar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
