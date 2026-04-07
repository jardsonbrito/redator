import { useNavigate } from 'react-router-dom';
import {
  BookMarked, ChevronLeft, ChevronRight,
  Lock, CheckCircle2, Circle, ArrowRight, Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { StudentHeader } from '@/components/StudentHeader';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { useStudentAuth } from '@/hooks/useStudentAuth';
import {
  useTasksAluno,
  useConcluirTask,
  labelTipoRecurso,
  rotaRecurso,
  type PEPTask,
} from '@/hooks/usePEP';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const badgeEixo: Record<string, string> = {
  C1: 'bg-blue-100 text-blue-700',
  C2: 'bg-orange-100 text-orange-700',
  C3: 'bg-purple-100 text-purple-700',
  C4: 'bg-teal-100 text-teal-700',
  C5: 'bg-rose-100 text-rose-700',
};

const nomeEixo: Record<string, string> = {
  C1: 'Norma Culta',
  C2: 'Repertório e Tema',
  C3: 'Argumentação',
  C4: 'Coesão',
  C5: 'Proposta de Intervenção',
};

// ─── Sub-componentes ──────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: PEPTask['status'] }) {
  if (status === 'ativa')
    return <Badge className="bg-[#3f0776] text-white text-xs">Em andamento</Badge>;
  if (status === 'concluida')
    return <Badge className="bg-green-100 text-green-700 text-xs">Concluída</Badge>;
  if (status === 'bloqueada')
    return <Badge className="bg-gray-100 text-gray-500 text-xs">Bloqueada</Badge>;
  return null;
}

function TaskAtiva({ task, email }: { task: PEPTask; email: string }) {
  const navigate = useNavigate();
  const { mutate: concluir, isPending } = useConcluirTask();
  const eixo = task.erro?.eixo ?? '';

  return (
    <div className="bg-white rounded-2xl border border-[#e5d5f8] shadow-sm overflow-hidden">
      {/* Cabeçalho da task */}
      <div className="bg-[#3f0776] px-6 py-4">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[#c8a8f0] text-xs font-semibold uppercase tracking-wider">
            Missão atual
          </span>
          {eixo && (
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${badgeEixo[eixo] ?? 'bg-white/20 text-white'}`}>
              {nomeEixo[eixo] ?? eixo}
            </span>
          )}
        </div>
        <h2 className="text-white text-xl font-bold">{task.titulo}</h2>
      </div>

      <div className="px-6 py-5 space-y-5">
        {/* Por que isso agora */}
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">
            Por que isso agora?
          </p>
          <p className="text-sm text-gray-700 leading-relaxed">{task.motivo}</p>
        </div>

        {/* O que fazer */}
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">
            O que fazer
          </p>
          <p className="text-sm text-gray-700 leading-relaxed">{task.acao}</p>
        </div>

        {/* Recurso vinculado */}
        {task.recurso && (
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
              Atividade vinculada
            </p>
            <button
              onClick={() => navigate(rotaRecurso(task.recurso!))}
              className="w-full flex items-center justify-between gap-3 bg-[#f8f4ff] border border-[#e5d5f8] rounded-xl px-4 py-3 hover:bg-[#f1e4fe] transition-colors text-left"
            >
              <div>
                <p className="text-[10px] font-semibold text-[#3f0776] uppercase tracking-wider">
                  {labelTipoRecurso(task.recurso.tipo)}
                </p>
                <p className="text-sm font-medium text-gray-800 mt-0.5">{task.recurso.titulo}</p>
                {task.recurso.descricao && (
                  <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{task.recurso.descricao}</p>
                )}
              </div>
              <ArrowRight className="w-4 h-4 text-[#3f0776] flex-shrink-0" />
            </button>
          </div>
        )}

        {/* Critério de conclusão */}
        <div className="bg-gray-50 rounded-xl px-4 py-3">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">
            Como concluir esta missão
          </p>
          <p className="text-sm text-gray-600">{task.criterio_conclusao}</p>
        </div>

        {/* Botão de conclusão */}
        <Button
          onClick={() => concluir({ taskId: task.id, alunoEmail: email })}
          disabled={isPending}
          className="w-full bg-[#3f0776] hover:bg-[#5a1a9e] text-white h-12 text-base font-semibold rounded-xl"
        >
          {isPending ? (
            <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Concluindo…</>
          ) : (
            <><CheckCircle2 className="w-4 h-4 mr-2" /> Marcar como concluída</>
          )}
        </Button>
      </div>
    </div>
  );
}

function TaskBloqueada({ task, ordem }: { task: PEPTask; ordem: number }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 px-6 py-4 flex items-center gap-4 opacity-60">
      <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
        <Lock className="w-4 h-4 text-gray-400" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-gray-400 mb-0.5">Missão {ordem}</p>
        <p className="text-sm font-semibold text-gray-500 truncate">{task.titulo}</p>
      </div>
      <Badge className="bg-gray-100 text-gray-400 text-xs flex-shrink-0">Bloqueada</Badge>
    </div>
  );
}

function TaskConcluida({ task }: { task: PEPTask }) {
  return (
    <div className="flex items-center gap-3 px-2 py-2">
      <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm text-gray-500 line-through truncate">{task.titulo}</p>
        {task.concluida_em && (
          <p className="text-xs text-gray-400">
            Concluída em {new Date(task.concluida_em).toLocaleDateString('pt-BR')}
          </p>
        )}
      </div>
    </div>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────

const PlanoEstudo = () => {
  const navigate = useNavigate();
  const { studentData } = useStudentAuth();
  const email = studentData.email ?? '';

  const { data: tasks = [], isLoading } = useTasksAluno(email || undefined);

  const taskAtiva    = tasks.find(t => t.status === 'ativa');
  const tasksBloq    = tasks.filter(t => t.status === 'bloqueada').sort((a, b) => a.ordem - b.ordem);
  const tasksConcl   = tasks.filter(t => t.status === 'concluida').sort((a, b) =>
    new Date(b.concluida_em ?? 0).getTime() - new Date(a.concluida_em ?? 0).getTime()
  );

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gradient-to-br from-secondary/20 via-secondary/10 to-secondary/5">
        <StudentHeader />

        <main className="max-w-2xl mx-auto px-4 py-8">
          {/* Voltar */}
          <button
            onClick={() => navigate('/app')}
            className="flex items-center gap-1 text-sm text-gray-500 hover:text-[#3f0776] mb-6 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            Voltar ao início
          </button>

          {/* Título */}
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-[#3f0776] rounded-xl flex items-center justify-center">
              <BookMarked className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-[#3f0776]">Plano de Estudo Personalizado</h1>
              <p className="text-xs text-gray-500">Trilha adaptada com base nos seus erros mais frequentes</p>
            </div>
          </div>

          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-[#3f0776]" />
              <p className="text-sm text-gray-500">Carregando seu plano…</p>
            </div>
          ) : tasks.length === 0 ? (
            /* Estado vazio */
            <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center">
              <div className="w-14 h-14 bg-[#f1e4fe] rounded-full flex items-center justify-center mx-auto mb-4">
                <BookMarked className="w-7 h-7 text-[#3f0776]" />
              </div>
              <h2 className="font-bold text-[#3f0776] mb-2">Seu plano está sendo montado</h2>
              <p className="text-sm text-gray-500 max-w-xs mx-auto">
                Envie uma redação, responda uma lousa ou faça um exercício para que seu plano personalizado seja gerado.
              </p>
              <Button
                onClick={() => navigate('/envie-redacao')}
                className="mt-5 bg-[#3f0776] hover:bg-[#5a1a9e] text-white"
              >
                Enviar redação
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Task ativa */}
              {taskAtiva ? (
                <TaskAtiva task={taskAtiva} email={email} />
              ) : (
                <div className="bg-[#f8f4ff] rounded-2xl border border-[#e5d5f8] p-6 text-center">
                  <CheckCircle2 className="w-8 h-8 text-green-500 mx-auto mb-2" />
                  <p className="font-semibold text-[#3f0776]">Todas as missões concluídas!</p>
                  <p className="text-sm text-gray-500 mt-1">Seu plano será atualizado em breve com novas missões.</p>
                </div>
              )}

              {/* Próximas missões */}
              {tasksBloq.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 px-1">
                    Próximas missões
                  </p>
                  <div className="space-y-2">
                    {tasksBloq.map((t, i) => (
                      <TaskBloqueada key={t.id} task={t} ordem={(taskAtiva ? 2 : 1) + i} />
                    ))}
                  </div>
                </div>
              )}

              {/* Histórico concluídas */}
              {tasksConcl.length > 0 && (
                <div className="bg-white rounded-2xl border border-gray-100 px-6 py-4">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                    Histórico
                  </p>
                  <div className="space-y-1 divide-y divide-gray-50">
                    {tasksConcl.map(t => (
                      <TaskConcluida key={t.id} task={t} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </ProtectedRoute>
  );
};

export default PlanoEstudo;
