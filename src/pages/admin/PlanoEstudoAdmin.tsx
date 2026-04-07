import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  BookMarked, Users, AlertTriangle, BarChart3,
  ChevronLeft, Search, CheckCircle2, Lock, Circle,
  ArrowUpDown, Plus, Ban, Unlock, RefreshCw, Loader2,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Navigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { diasParado, type PEPTask } from '@/hooks/usePEP';

// ─── Queries admin ────────────────────────────────────────────────────────────

function useVisaoMacro() {
  return useQuery({
    queryKey: ['pep-admin-macro'],
    queryFn: async () => {
      // Erros mais recorrentes (top 10 da base)
      const { data: erros } = await supabase
        .from('pep_consolidacao_erros')
        .select('erro_id, recorrencia, pep_taxonomia_erros:pep_taxonomia_erros(nome, eixo)')
        .order('recorrencia', { ascending: false })
        .limit(50);

      // Agrupa por erro somando recorrências
      const map = new Map<string, { nome: string; eixo: string; total: number; alunos: Set<string> }>();
      (erros ?? []).forEach((r: any) => {
        const key = r.erro_id;
        const cur = map.get(key) ?? {
          nome: r.pep_taxonomia_erros?.nome ?? key,
          eixo: r.pep_taxonomia_erros?.eixo ?? '',
          total: 0,
          alunos: new Set(),
        };
        cur.total += r.recorrencia;
        map.set(key, cur);
      });
      const errosTop = Array.from(map.entries())
        .map(([id, v]) => ({ id, nome: v.nome, eixo: v.eixo, total: v.total }))
        .sort((a, b) => b.total - a.total)
        .slice(0, 10);

      // Alunos com task ativa há > 5 dias sem progresso
      const { data: tasksAtivas } = await supabase
        .from('pep_tasks')
        .select('aluno_email, titulo, ativada_em')
        .eq('status', 'ativa');

      const alunosParados = (tasksAtivas ?? [])
        .map((t: any) => ({ ...t, dias: diasParado(t.ativada_em) }))
        .filter(t => (t.dias ?? 0) >= 5)
        .sort((a, b) => (b.dias ?? 0) - (a.dias ?? 0));

      // Recursos mais acionados
      const { data: recursos } = await supabase
        .from('pep_tasks')
        .select('recurso_id, pep_recursos:pep_recursos(titulo, tipo)')
        .not('recurso_id', 'is', null)
        .limit(200);

      const recMap = new Map<string, { titulo: string; tipo: string; count: number }>();
      (recursos ?? []).forEach((r: any) => {
        if (!r.recurso_id) return;
        const cur = recMap.get(r.recurso_id) ?? {
          titulo: r.pep_recursos?.titulo ?? r.recurso_id,
          tipo: r.pep_recursos?.tipo ?? '',
          count: 0,
        };
        cur.count++;
        recMap.set(r.recurso_id, cur);
      });
      const recursosTop = Array.from(recMap.values())
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      return { errosTop, alunosParados, recursosTop };
    },
    staleTime: 120_000,
  });
}

function useTasksAlunoAdmin(email: string) {
  return useQuery({
    queryKey: ['pep-admin-tasks', email],
    queryFn: async (): Promise<PEPTask[]> => {
      if (!email) return [];
      const { data, error } = await supabase
        .from('pep_tasks')
        .select('*, erro:pep_taxonomia_erros(*), recurso:pep_recursos(*)')
        .eq('aluno_email', email.toLowerCase().trim())
        .order('ordem', { ascending: true });
      if (error) throw error;
      return (data ?? []) as PEPTask[];
    },
    enabled: !!email,
  });
}

function useErrosConsolAdmin(email: string) {
  return useQuery({
    queryKey: ['pep-admin-erros', email],
    queryFn: async () => {
      if (!email) return [];
      const { data } = await supabase
        .from('pep_consolidacao_erros')
        .select('*, erro:pep_taxonomia_erros(*)')
        .eq('aluno_email', email.toLowerCase().trim())
        .order('recorrencia', { ascending: false })
        .limit(10);
      return data ?? [];
    },
    enabled: !!email,
  });
}

// ─── Mutations admin ──────────────────────────────────────────────────────────

function useIntervenirTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      taskId, acao, alunoEmail,
    }: { taskId: string; acao: 'ativar' | 'bloquear' | 'cancelar'; alunoEmail: string }) => {
      const statusMap = { ativar: 'ativa', bloquear: 'bloqueada', cancelar: 'cancelada' };
      const updates: Record<string, string | null> = { status: statusMap[acao] };
      if (acao === 'ativar') updates.ativada_em = new Date().toISOString();
      if (acao === 'cancelar') updates.cancelada_em = new Date().toISOString();

      // Se ativando, garantir que não haja outra ativa
      if (acao === 'ativar') {
        await supabase
          .from('pep_tasks')
          .update({ status: 'bloqueada' })
          .eq('aluno_email', alunoEmail.toLowerCase().trim())
          .eq('status', 'ativa')
          .neq('id', taskId);
      }

      const { error } = await supabase
        .from('pep_tasks')
        .update(updates)
        .eq('id', taskId);
      if (error) throw error;
    },
    onSuccess: (_, { alunoEmail }) => {
      qc.invalidateQueries({ queryKey: ['pep-admin-tasks', alunoEmail] });
      toast.success('Task atualizada com sucesso.');
    },
    onError: () => toast.error('Erro ao atualizar task.'),
  });
}

// ─── Eixo badge ───────────────────────────────────────────────────────────────

const eixoBadge: Record<string, string> = {
  C1: 'bg-blue-100 text-blue-700',
  C2: 'bg-orange-100 text-orange-700',
  C3: 'bg-purple-100 text-purple-700',
  C4: 'bg-teal-100 text-teal-700',
  C5: 'bg-rose-100 text-rose-700',
};

// ─── Busca de alunos por nome ─────────────────────────────────────────────────

function useBuscaAlunos(termo: string) {
  return useQuery({
    queryKey: ['pep-busca-alunos', termo],
    queryFn: async () => {
      if (termo.length < 2) return [];
      const { data } = await supabase
        .from('profiles')
        .select('nome, email, turma')
        .eq('user_type', 'aluno')
        .eq('is_authenticated_student', true)
        .ilike('nome', `%${termo}%`)
        .order('nome', { ascending: true })
        .limit(10);
      return data ?? [];
    },
    enabled: termo.length >= 2,
    staleTime: 30_000,
  });
}

// ─── Visão Individual ─────────────────────────────────────────────────────────

function VisaoIndividual() {
  const [busca, setBusca] = useState('');
  const [emailAtivo, setEmailAtivo]   = useState('');
  const [nomeAtivo, setNomeAtivo]     = useState('');
  const [turmaAtivo, setTurmaAtivo]   = useState('');
  const [mostrarLista, setMostrarLista] = useState(false);

  const { data: resultados = [], isFetching: buscando } = useBuscaAlunos(busca);
  const { data: tasks = [], isLoading: loadTasks } = useTasksAlunoAdmin(emailAtivo);
  const { data: erros = [], isLoading: loadErros }  = useErrosConsolAdmin(emailAtivo);
  const { mutate: intervir, isPending: intervindo }  = useIntervenirTask();

  const selecionarAluno = (nome: string, email: string, turma: string) => {
    setEmailAtivo(email.toLowerCase().trim());
    setNomeAtivo(nome);
    setTurmaAtivo(turma);
    setBusca('');
    setMostrarLista(false);
  };

  return (
    <div className="space-y-6">
      {/* Busca por nome */}
      <div className="relative max-w-sm">
        <div className="flex gap-2 items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Buscar aluno por nome…"
              value={busca}
              onChange={e => { setBusca(e.target.value); setMostrarLista(true); }}
              onFocus={() => setMostrarLista(true)}
              className="pl-9"
              autoComplete="off"
            />
            {buscando && (
              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-3 h-3 animate-spin text-gray-400" />
            )}
          </div>
          {emailAtivo && (
            <Button
              variant="ghost" size="sm"
              onClick={() => { setEmailAtivo(''); setNomeAtivo(''); setTurmaAtivo(''); }}
              className="text-xs text-gray-500"
            >
              Limpar
            </Button>
          )}
        </div>

        {/* Dropdown de resultados */}
        {mostrarLista && busca.length >= 2 && resultados.length > 0 && (
          <div className="absolute top-full mt-1 left-0 right-0 bg-white border border-gray-200 rounded-xl shadow-lg z-10 overflow-hidden">
            {(resultados as any[]).map((a, i) => (
              <button
                key={i}
                onClick={() => selecionarAluno(a.nome, a.email, a.turma ?? '')}
                className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-[#f8f4ff] text-left transition-colors"
              >
                <div className="w-7 h-7 rounded-full bg-[#3f0776] flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                  {(a.nome ?? '?').charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{a.nome}</p>
                  <p className="text-xs text-gray-400 truncate">{a.email}{a.turma ? ` · ${a.turma}` : ''}</p>
                </div>
              </button>
            ))}
          </div>
        )}

        {mostrarLista && busca.length >= 2 && resultados.length === 0 && !buscando && (
          <div className="absolute top-full mt-1 left-0 right-0 bg-white border border-gray-200 rounded-xl shadow-lg z-10 px-3 py-3">
            <p className="text-sm text-gray-400 text-center">Nenhum aluno encontrado.</p>
          </div>
        )}
      </div>

      {/* Cabeçalho do aluno selecionado */}
      {emailAtivo && (
        <div className="flex items-center gap-3 bg-[#f8f4ff] rounded-xl px-4 py-3 border border-[#e5d5f8]">
          <div className="w-9 h-9 rounded-full bg-[#3f0776] flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
            {nomeAtivo.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="font-semibold text-[#3f0776] text-sm">{nomeAtivo}</p>
            <p className="text-xs text-gray-500">{emailAtivo}{turmaAtivo ? ` · ${turmaAtivo}` : ''}</p>
          </div>
        </div>
      )}

      {!emailAtivo ? (
        <div className="text-center text-gray-400 py-12 text-sm">
          Busque um aluno pelo nome para visualizar o plano.
        </div>
      ) : loadTasks || loadErros ? (
        <div className="flex items-center gap-2 text-sm text-gray-500 py-8 justify-center">
          <Loader2 className="w-4 h-4 animate-spin" /> Carregando…
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Coluna esquerda: status da trilha */}
          <div className="lg:col-span-2 space-y-3">
            <h3 className="font-semibold text-gray-700 text-sm">Status da trilha</h3>

            {tasks.length === 0 ? (
              <p className="text-sm text-gray-400">Nenhuma task encontrada para este aluno.</p>
            ) : (
              tasks.filter(t => t.status !== 'cancelada').map(task => (
                <div
                  key={task.id}
                  className={`rounded-xl border p-4 ${
                    task.status === 'ativa' ? 'border-[#3f0776] bg-[#f8f4ff]' :
                    task.status === 'concluida' ? 'border-green-200 bg-green-50' :
                    'border-gray-100 bg-white'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        {task.status === 'ativa' && (
                          <Badge className="bg-[#3f0776] text-white text-xs">Ativa</Badge>
                        )}
                        {task.status === 'concluida' && (
                          <Badge className="bg-green-100 text-green-700 text-xs">Concluída</Badge>
                        )}
                        {task.status === 'bloqueada' && (
                          <Badge className="bg-gray-100 text-gray-500 text-xs">Bloqueada</Badge>
                        )}
                        {task.erro?.eixo && (
                          <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${eixoBadge[task.erro.eixo] ?? ''}`}>
                            {task.erro.eixo}
                          </span>
                        )}
                        <span className="text-xs text-gray-400">Ordem #{task.ordem}</span>
                      </div>
                      <p className="font-semibold text-gray-800 text-sm">{task.titulo}</p>
                      <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{task.motivo}</p>
                      {task.status === 'ativa' && task.ativada_em && (
                        <p className={`text-xs mt-1 font-medium ${
                          (diasParado(task.ativada_em) ?? 0) >= 5 ? 'text-red-500' : 'text-gray-400'
                        }`}>
                          Ativa há {diasParado(task.ativada_em) ?? 0} dia(s)
                        </p>
                      )}
                    </div>

                    {/* Ações */}
                    <div className="flex gap-1 flex-shrink-0">
                      {task.status === 'bloqueada' && (
                        <Button
                          size="sm" variant="outline"
                          className="h-7 text-xs"
                          disabled={intervindo}
                          onClick={() => intervir({ taskId: task.id, acao: 'ativar', alunoEmail: emailAtivo })}
                        >
                          <Unlock className="w-3 h-3 mr-1" /> Liberar
                        </Button>
                      )}
                      {task.status === 'ativa' && (
                        <Button
                          size="sm" variant="outline"
                          className="h-7 text-xs"
                          disabled={intervindo}
                          onClick={() => intervir({ taskId: task.id, acao: 'bloquear', alunoEmail: emailAtivo })}
                        >
                          <Ban className="w-3 h-3 mr-1" /> Bloquear
                        </Button>
                      )}
                      {task.status !== 'cancelada' && task.status !== 'concluida' && (
                        <Button
                          size="sm" variant="ghost"
                          className="h-7 text-xs text-red-500 hover:bg-red-50"
                          disabled={intervindo}
                          onClick={() => intervir({ taskId: task.id, acao: 'cancelar', alunoEmail: emailAtivo })}
                        >
                          <Ban className="w-3 h-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Coluna direita: recorrências detectadas */}
          <div>
            <h3 className="font-semibold text-gray-700 text-sm mb-3">Principais recorrências</h3>
            {erros.length === 0 ? (
              <p className="text-sm text-gray-400">Nenhum erro detectado ainda.</p>
            ) : (
              <div className="space-y-2">
                {(erros as any[]).map((e, i) => (
                  <div key={e.erro_id} className="bg-white rounded-xl border border-gray-100 px-3 py-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-400 font-mono">#{i + 1}</span>
                        {e.erro?.eixo && (
                          <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${eixoBadge[e.erro.eixo] ?? ''}`}>
                            {e.erro.eixo}
                          </span>
                        )}
                      </div>
                      <span className="text-sm font-bold text-[#3f0776]">{e.recorrencia}×</span>
                    </div>
                    <p className="text-xs text-gray-700 font-medium mt-1">{e.erro?.nome ?? e.erro_id}</p>
                    {e.ultima_deteccao && (
                      <p className="text-[10px] text-gray-400 mt-0.5">
                        Último: {new Date(e.ultima_deteccao).toLocaleDateString('pt-BR')}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Visão Macro ──────────────────────────────────────────────────────────────

function VisaoMacro() {
  const { data, isLoading } = useVisaoMacro();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16 gap-2 text-sm text-gray-500">
        <Loader2 className="w-4 h-4 animate-spin" /> Carregando visão geral…
      </div>
    );
  }

  const { errosTop = [], alunosParados = [], recursosTop = [] } = data ?? {};

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Erros mais recorrentes */}
      <div className="lg:col-span-1">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-[#3f0776]" />
              Erros mais recorrentes
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {errosTop.length === 0 ? (
              <p className="text-sm text-gray-400">Sem dados ainda.</p>
            ) : errosTop.map((e, i) => (
              <div key={e.id} className="flex items-center gap-2">
                <span className="text-xs text-gray-400 font-mono w-4">#{i + 1}</span>
                {e.eixo && (
                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${eixoBadge[e.eixo] ?? ''}`}>
                    {e.eixo}
                  </span>
                )}
                <span className="text-xs text-gray-700 flex-1 truncate">{e.nome}</span>
                <span className="text-xs font-bold text-[#3f0776]">{e.total}×</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Alunos parados */}
      <div className="lg:col-span-1">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              Alunos parados (&ge; 5 dias)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {alunosParados.length === 0 ? (
              <p className="text-sm text-gray-400">Nenhum aluno parado.</p>
            ) : (alunosParados as any[]).map((a, i) => (
              <div key={i} className="rounded-lg bg-amber-50 border border-amber-100 px-3 py-2">
                <p className="text-xs font-medium text-gray-700 truncate">{a.aluno_email}</p>
                <p className="text-[10px] text-gray-500 truncate">{a.titulo}</p>
                <p className="text-[10px] font-bold text-amber-600 mt-0.5">{a.dias} dia(s) parado</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Recursos mais acionados */}
      <div className="lg:col-span-1">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <BookMarked className="w-4 h-4 text-[#3f0776]" />
              Recursos mais acionados
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {recursosTop.length === 0 ? (
              <p className="text-sm text-gray-400">Sem dados ainda.</p>
            ) : recursosTop.map((r, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="text-xs text-gray-400 font-mono w-4">#{i + 1}</span>
                <span className="text-xs text-gray-700 flex-1 truncate">{r.titulo}</span>
                <span className="text-xs font-bold text-[#3f0776]">{r.count}×</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────

export default function PlanoEstudoAdmin() {
  const navigate = useNavigate();
  const { isAdmin } = useAuth();

  if (!isAdmin) return <Navigate to="/login" replace />;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Cabeçalho */}
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => navigate('/admin')}
            className="flex items-center gap-1 text-sm text-gray-500 hover:text-[#3f0776] transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            Admin
          </button>
          <span className="text-gray-300">/</span>
          <div className="flex items-center gap-2">
            <BookMarked className="w-5 h-5 text-[#3f0776]" />
            <h1 className="text-lg font-bold text-[#3f0776]">Plano de Estudo Personalizado</h1>
          </div>
        </div>

        <Tabs defaultValue="macro">
          <TabsList className="mb-6">
            <TabsTrigger value="macro" className="flex items-center gap-1.5">
              <BarChart3 className="w-4 h-4" /> Visão Geral
            </TabsTrigger>
            <TabsTrigger value="individual" className="flex items-center gap-1.5">
              <Users className="w-4 h-4" /> Por Aluno
            </TabsTrigger>
          </TabsList>

          <TabsContent value="macro">
            <VisaoMacro />
          </TabsContent>

          <TabsContent value="individual">
            <VisaoIndividual />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
