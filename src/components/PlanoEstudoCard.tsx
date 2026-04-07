import { useNavigate } from 'react-router-dom';
import { BookMarked, ChevronRight, Lock, CheckCircle2, Loader2 } from 'lucide-react';
import { useStudentAuth } from '@/hooks/useStudentAuth';
import { useTasksAluno } from '@/hooks/usePEP';

export const PlanoEstudoCard = () => {
  const navigate = useNavigate();
  const { studentData } = useStudentAuth();
  const email = studentData.email ?? '';

  const { data: tasks = [], isLoading } = useTasksAluno(email || undefined);

  const taskAtiva    = tasks.find(t => t.status === 'ativa');
  const proximaBloq  = tasks.find(t => t.status === 'bloqueada' && (!taskAtiva || t.ordem > taskAtiva.ordem));
  const concluidas   = tasks.filter(t => t.status === 'concluida').length;

  return (
    <div
      className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 cursor-pointer hover:shadow-md transition-shadow"
      onClick={() => navigate('/plano-estudo')}
    >
      {/* Cabeçalho */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[#3f0776] rounded-xl flex items-center justify-center flex-shrink-0">
            <BookMarked className="w-5 h-5 text-white" />
          </div>
          <h2 className="text-lg font-bold text-[#3f0776]">Plano de Estudo Personalizado</h2>
        </div>
        <ChevronRight className="w-5 h-5 text-gray-400" />
      </div>

      {isLoading ? (
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Loader2 className="w-4 h-4 animate-spin" />
          Carregando seu plano…
        </div>
      ) : !taskAtiva ? (
        /* Estado vazio */
        <div className="bg-[#f8f4ff] rounded-xl p-4 text-center">
          <p className="text-sm text-[#3f0776] font-medium">Seu plano ainda está sendo montado</p>
          <p className="text-xs text-gray-500 mt-1">
            Envie uma redação ou faça um exercício para iniciar sua trilha personalizada.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Missão atual */}
          <div className="bg-[#f1e4fe] rounded-xl p-4">
            <p className="text-[10px] font-semibold text-[#3f0776] uppercase tracking-wider mb-1">
              Missão atual
            </p>
            <p className="font-bold text-[#3f0776] text-sm leading-snug">{taskAtiva.titulo}</p>
            <p className="text-xs text-gray-600 mt-1 line-clamp-2">{taskAtiva.motivo}</p>
            <div className="mt-3 flex items-center gap-1 text-[#3f0776] text-xs font-medium">
              <span>Ver o que fazer</span>
              <ChevronRight className="w-3 h-3" />
            </div>
          </div>

          {/* Próxima missão */}
          {proximaBloq && (
            <div className="flex items-center gap-2 px-1 py-0.5">
              <Lock className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
              <span className="text-xs text-gray-400 truncate">
                Próxima: {proximaBloq.titulo}
              </span>
            </div>
          )}

          {/* Missões concluídas */}
          {concluidas > 0 && (
            <div className="flex items-center gap-1.5 px-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
              <span className="text-xs text-green-600 font-medium">
                {concluidas} {concluidas === 1 ? 'missão concluída' : 'missões concluídas'}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
