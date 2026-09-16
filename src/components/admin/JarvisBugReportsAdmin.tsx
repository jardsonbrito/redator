import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CheckCircle2, Circle, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface BugReport {
  id: string;
  aluno_email: string;
  aluno_nome?: string | null;
  conversation_id: string | null;
  descricao: string;
  resolvido: boolean;
  created_at: string;
}

export function JarvisBugReportsAdmin() {
  const [reports, setReports]   = useState<BugReport[]>([]);
  const [loading, setLoading]   = useState(true);
  const [busca, setBusca]       = useState('');
  const [filtro, setFiltro]     = useState<'todos' | 'abertos' | 'resolvidos'>('abertos');

  const carregar = useCallback(async () => {
    setLoading(true);
    try {
      let query = (supabase as any)
        .from('jarvis_bug_reports')
        .select('*')
        .order('created_at', { ascending: false });

      if (filtro === 'abertos')    query = query.eq('resolvido', false);
      if (filtro === 'resolvidos') query = query.eq('resolvido', true);

      const { data } = await query;
      const reports: BugReport[] = data ?? [];

      // Enriquecer com nome dos alunos
      const emails = [...new Set(reports.map(r => r.aluno_email).filter(Boolean))];
      if (emails.length > 0) {
        const { data: perfis } = await (supabase as any)
          .from('profiles')
          .select('email, nome, sobrenome')
          .in('email', emails);
        const nomeMap: Record<string, string> = {};
        for (const p of perfis ?? []) {
          const nome = [p.nome, p.sobrenome].filter(Boolean).join(' ').trim();
          if (nome) nomeMap[p.email] = nome;
        }
        for (const r of reports) r.aluno_nome = nomeMap[r.aluno_email] ?? null;
      }

      setReports(reports);
    } finally {
      setLoading(false);
    }
  }, [filtro]);

  useEffect(() => { carregar(); }, [carregar]);

  const toggleResolvido = async (report: BugReport) => {
    await (supabase as any)
      .from('jarvis_bug_reports')
      .update({ resolvido: !report.resolvido })
      .eq('id', report.id);
    setReports(prev =>
      prev.map(r => r.id === report.id ? { ...r, resolvido: !r.resolvido } : r)
    );
  };

  const filtrados = busca.trim()
    ? reports.filter(r =>
        r.aluno_email.toLowerCase().includes(busca.toLowerCase()) ||
        r.descricao.toLowerCase().includes(busca.toLowerCase())
      )
    : reports;

  const abertos    = reports.filter(r => !r.resolvido).length;
  const resolvidos = reports.filter(r => r.resolvido).length;

  return (
    <div className="space-y-4">
      {/* Contadores + filtros */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex gap-2">
          {(['todos', 'abertos', 'resolvidos'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFiltro(f)}
              className={cn(
                'px-3 py-1.5 rounded-full text-xs font-medium transition-colors',
                filtro === f
                  ? 'bg-purple-700 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              )}
            >
              {f === 'todos' ? `Todos (${abertos + resolvidos})` : f === 'abertos' ? `Abertos (${abertos})` : `Resolvidos (${resolvidos})`}
            </button>
          ))}
        </div>

        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
          <Input
            value={busca}
            onChange={e => setBusca(e.target.value)}
            placeholder="Buscar por aluno ou descrição..."
            className="pl-9"
          />
        </div>

        <span className="text-sm text-slate-500">
          {filtrados.length} {filtrados.length === 1 ? 'relato' : 'relatos'}
        </span>
      </div>

      {/* Lista */}
      <div className="rounded-xl border border-slate-200 overflow-hidden divide-y divide-slate-100">
        {loading ? (
          <div className="px-4 py-8 text-center text-slate-400 text-sm">Carregando...</div>
        ) : filtrados.length === 0 ? (
          <div className="px-4 py-8 text-center text-slate-400 text-sm">
            {filtro === 'abertos' ? 'Nenhum problema em aberto.' : 'Nenhum relato encontrado.'}
          </div>
        ) : (
          filtrados.map(report => (
            <div
              key={report.id}
              className={cn(
                'flex items-start gap-4 px-5 py-4 transition-colors',
                report.resolvido ? 'bg-slate-50/60' : 'bg-white'
              )}
            >
              {/* Toggle resolvido */}
              <button
                onClick={() => toggleResolvido(report)}
                title={report.resolvido ? 'Marcar como aberto' : 'Marcar como resolvido'}
                className="mt-0.5 flex-shrink-0 text-slate-300 hover:text-green-500 transition-colors"
              >
                {report.resolvido
                  ? <CheckCircle2 className="w-5 h-5 text-green-500" />
                  : <Circle className="w-5 h-5" />
                }
              </button>

              {/* Conteúdo */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className={cn('text-sm font-medium', report.resolvido ? 'text-slate-400 line-through' : 'text-slate-800')}>
                    {report.aluno_nome ?? report.aluno_email}
                  </span>
                  {report.aluno_nome && (
                    <span className="text-[11px] text-slate-400">{report.aluno_email}</span>
                  )}
                  {!report.resolvido && (
                    <Badge variant="outline" className="text-[10px] text-amber-600 border-amber-200 bg-amber-50">
                      Aberto
                    </Badge>
                  )}
                </div>
                <p className={cn('text-sm leading-relaxed', report.resolvido ? 'text-slate-400' : 'text-slate-700')}>
                  {report.descricao}
                </p>
                <p className="text-[11px] text-slate-400 mt-1.5">
                  {format(new Date(report.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                  {report.conversation_id && (
                    <span className="ml-2 text-slate-300">· conversa {report.conversation_id.slice(0, 8)}…</span>
                  )}
                </p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
