import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { BookOpen, ChevronRight } from 'lucide-react';
import type { MicroTopico } from '@/hooks/useMicroTopicos';

interface Props {
  topico: MicroTopico;
}

export const MicroTopicCard = ({ topico }: Props) => {
  const navigate = useNavigate();
  const pct = topico.total_itens > 0
    ? Math.round((topico.total_concluidos / topico.total_itens) * 100)
    : 0;
  const todosConcluidos = topico.total_itens > 0 && topico.total_concluidos === topico.total_itens;

  return (
    <Card
      className="cursor-pointer hover:shadow-md transition-all border border-gray-100 hover:border-purple-200"
      onClick={() => navigate(`/microaprendizagem/${topico.id}`)}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center shrink-0">
            <BookOpen className="w-5 h-5 text-[#3f0776]" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-semibold text-gray-800 truncate">{topico.titulo}</h3>
              <ChevronRight className="w-4 h-4 text-gray-300 shrink-0" />
            </div>
            {topico.descricao && (
              <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{topico.descricao}</p>
            )}

            {/* Barra de progresso */}
            <div className="mt-3 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-400">
                  {topico.total_concluidos}/{topico.total_itens} concluídos
                </span>
                <span className={`text-xs font-medium ${todosConcluidos ? 'text-green-600' : 'text-purple-600'}`}>
                  {pct}%
                </span>
              </div>
              <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${todosConcluidos ? 'bg-green-500' : 'bg-[#3f0776]'}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
