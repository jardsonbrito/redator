import { useNavigate } from 'react-router-dom';
import { BookOpen, CheckCircle2, ChevronRight } from 'lucide-react';
import type { MicroTopico } from '@/hooks/useMicroTopicos';

const GRADIENTS = [
  'from-violet-500 to-purple-700',
  'from-blue-500 to-indigo-700',
  'from-emerald-500 to-teal-700',
  'from-amber-500 to-orange-500',
  'from-rose-500 to-pink-600',
  'from-cyan-500 to-blue-600',
];

interface Props {
  topico: MicroTopico;
  index?: number;
}

export const MicroTopicCard = ({ topico, index = 0 }: Props) => {
  const navigate = useNavigate();
  const gradient = GRADIENTS[index % GRADIENTS.length];

  const pct = topico.total_itens > 0
    ? Math.round((topico.total_concluidos / topico.total_itens) * 100)
    : 0;
  const todosConcluidos = topico.total_itens > 0 && topico.total_concluidos === topico.total_itens;

  return (
    <div
      className="rounded-2xl overflow-hidden shadow-sm hover:shadow-lg transition-all duration-200 cursor-pointer hover:scale-[1.02] bg-white border border-gray-100"
      onClick={() => navigate(`/microaprendizagem/${topico.id}`)}
    >
      {/* Banner com gradiente e ícone */}
      <div className={`bg-gradient-to-br ${gradient} flex flex-col items-center justify-center py-7 gap-2 relative`}>
        <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center backdrop-blur-sm">
          <BookOpen className="w-7 h-7 text-white" />
        </div>
        {todosConcluidos && (
          <div className="absolute top-3 right-3">
            <CheckCircle2 className="w-5 h-5 text-white/90" />
          </div>
        )}
        <span className="text-xs font-medium text-white/70">
          {topico.total_itens} {topico.total_itens === 1 ? 'conteúdo' : 'conteúdos'}
        </span>
      </div>

      {/* Corpo */}
      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-1">
          <h3 className="text-sm font-bold text-gray-800 leading-tight line-clamp-2">{topico.titulo}</h3>
          <ChevronRight className="w-4 h-4 text-gray-300 shrink-0 mt-0.5" />
        </div>

        {topico.descricao && (
          <p className="text-xs text-gray-400 line-clamp-2 mb-3">{topico.descricao}</p>
        )}

        {/* Progresso */}
        <div className="space-y-1.5 mt-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-400">
              {topico.total_concluidos}/{topico.total_itens} concluídos
            </span>
            <span className={`text-xs font-semibold ${todosConcluidos ? 'text-green-600' : 'text-purple-600'}`}>
              {pct}%
            </span>
          </div>
          <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${todosConcluidos ? 'bg-green-500' : 'bg-[#3f0776]'}`}
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
