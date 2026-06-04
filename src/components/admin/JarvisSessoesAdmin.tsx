import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ChevronDown, ChevronUp, Clock, MessageSquare, Search } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface Sessao {
  id: string;
  aluno_email: string;
  aluno_nome?: string;
  turma: string | null;
  subtab_nome: string | null;
  resumo: string | null;
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

const NIVEL_COR: Record<string, string> = {
  verde:    'bg-green-100 text-green-700 border-green-200',
  amarelo:  'bg-yellow-100 text-yellow-700 border-yellow-200',
  vermelho: 'bg-red-100 text-red-700 border-red-200',
};
const NIVEL_EMOJI: Record<string, string> = { verde: '🟢', amarelo: '🟡', vermelho: '🔴' };
const SUBTAB_LABEL: Record<string, string> = {
  introducao: 'Introdução', desenvolvimento: 'Desenvolvimento', conclusao: 'Conclusão',
  analisar: 'Analisar Texto', melhorar: 'Melhorar Texto',
  repertorio: 'Repertório', gramatica: 'Gramática',
};

function SessaoRow({ sessao }: { sessao: Sessao }) {
  const [expandida, setExpandida] = useState(false);

  return (
    <>
      <tr
        className="border-b hover:bg-slate-50 cursor-pointer"
        onClick={() => setExpandida(v => !v)}
      >
        <td className="px-4 py-3">
          <div className="font-medium text-sm text-slate-800">{sessao.aluno_nome || sessao.aluno_email}</div>
          <div className="text-xs text-slate-400">{sessao.aluno_email}</div>
        </td>
        <td className="px-4 py-3 text-xs text-slate-500">{sessao.turma ?? '—'}</td>
        <td className="px-4 py-3">
          <Badge variant="outline" className="text-xs">
            {sessao.subtab_nome ? (SUBTAB_LABEL[sessao.subtab_nome] ?? sessao.subtab_nome) : 'Livre'}
          </Badge>
        </td>
        <td className="px-4 py-3 text-xs text-slate-500">
          {format(new Date(sessao.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
        </td>
        <td className="px-4 py-3">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            {sessao.duracao_minutos > 0 && (
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />{sessao.duracao_minutos}min
              </span>
            )}
            {sessao.total_mensagens > 0 && (
              <span className="flex items-center gap-1">
                <MessageSquare className="w-3 h-3" />{sessao.total_mensagens}
              </span>
            )}
          </div>
        </td>
        <td className="px-4 py-3">
          <div className="flex flex-wrap gap-1">
            {sessao.habilidades.slice(0, 3).map((h, i) => (
              <span key={i} className={cn('text-[10px] px-1.5 py-0.5 rounded-full border font-medium', NIVEL_COR[h.nivel])}>
                {NIVEL_EMOJI[h.nivel]} {h.label}
              </span>
            ))}
          </div>
        </td>
        <td className="px-4 py-3 text-center">
          {expandida ? <ChevronUp className="w-4 h-4 text-slate-400 mx-auto" /> : <ChevronDown className="w-4 h-4 text-slate-400 mx-auto" />}
        </td>
      </tr>

      {expandida && (
        <tr className="bg-slate-50 border-b">
          <td colSpan={7} className="px-6 py-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

              {/* Resumo */}
              {sessao.resumo && (
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">O que foi estudado</p>
                  <p className="text-sm text-slate-700 leading-relaxed">{sessao.resumo}</p>
                </div>
              )}

              {/* Dificuldades */}
              {sessao.dificuldades.length > 0 && (
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Dificuldades</p>
                  <ul className="space-y-1">
                    {sessao.dificuldades.map((d, i) => (
                      <li key={i} className="text-sm text-slate-700 flex gap-2">
                        <span className="text-red-400 flex-shrink-0">•</span>{d}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Próximos passos */}
              {sessao.proximos_passos.length > 0 && (
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Próximos passos</p>
                  <ul className="space-y-1">
                    {sessao.proximos_passos.map((p, i) => (
                      <li key={i} className="text-sm text-slate-700 flex gap-2">
                        <span className="text-purple-400 flex-shrink-0">→</span>{p}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Orientação ao professor */}
              {sessao.orientacao_professor && (
                <div className="md:col-span-2 bg-white rounded-xl border border-slate-200 p-4">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Orientação ao Professor</p>
                  <p className="text-sm text-slate-700 leading-relaxed">{sessao.orientacao_professor}</p>
                </div>
              )}

              {/* Tags PEP */}
              {sessao.tags_dificuldades.length > 0 && (
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Tags (base para PEP)</p>
                  <div className="flex flex-wrap gap-1">
                    {sessao.tags_dificuldades.map(t => (
                      <span key={t} className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">{t}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
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

  const meses = [
    { v: 1, l: 'Janeiro' }, { v: 2, l: 'Fevereiro' }, { v: 3, l: 'Março' },
    { v: 4, l: 'Abril' },   { v: 5, l: 'Maio' },      { v: 6, l: 'Junho' },
    { v: 7, l: 'Julho' },   { v: 8, l: 'Agosto' },    { v: 9, l: 'Setembro' },
    { v: 10, l: 'Outubro' },{ v: 11, l: 'Novembro' }, { v: 12, l: 'Dezembro' },
  ];
  const anos = [now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1];

  const carregar = useCallback(async () => {
    setLoading(true);
    try {
      const inicio = new Date(ano, mes - 1, 1).toISOString();
      const fim    = new Date(ano, mes, 0, 23, 59, 59).toISOString();

      let query = (supabase as any)
        .from('jarvis_sessoes_sintetizadas')
        .select(`*, profiles!jarvis_sessoes_sintetizadas_aluno_id_fkey(nome, sobrenome)`)
        .gte('created_at', inicio)
        .lte('created_at', fim)
        .order('created_at', { ascending: false });

      if (turmaFiltro !== 'todas') query = query.eq('turma', turmaFiltro);

      const { data } = await query;

      const mapped = (data ?? []).map((s: any) => ({
        ...s,
        aluno_nome: s.profiles
          ? `${s.profiles.nome ?? ''} ${s.profiles.sobrenome ?? ''}`.trim()
          : null,
      }));
      setSessoes(mapped);
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
          <Input
            value={busca}
            onChange={e => setBusca(e.target.value)}
            placeholder="Buscar aluno..."
            className="pl-9"
          />
        </div>
        <span className="text-sm text-slate-500">{sessoesFiltradas.length} {sessoesFiltradas.length === 1 ? 'sessão' : 'sessões'}</span>
      </div>

      {/* Tabela */}
      <div className="rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Aluno</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Turma</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Assunto</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Data</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Duração</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Habilidades</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-400 text-sm">Carregando...</td></tr>
            ) : sessoesFiltradas.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-400 text-sm">Nenhuma sessão neste período.</td></tr>
            ) : (
              sessoesFiltradas.map(s => <SessaoRow key={s.id} sessao={s} />)
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
