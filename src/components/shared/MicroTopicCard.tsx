import { useNavigate } from 'react-router-dom';
import { BookOpen, CheckCircle2, ChevronRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import type { MicroTopico } from '@/hooks/useMicroTopicos';

const GRADIENTS = [
  'from-violet-500 to-purple-700',
  'from-blue-500 to-indigo-700',
  'from-emerald-500 to-teal-700',
  'from-amber-500 to-orange-500',
  'from-rose-500 to-pink-600',
  'from-cyan-500 to-blue-600',
];

const getCoverUrl = (path: string) => {
  const { data } = supabase.storage.from('micro-covers').getPublicUrl(path);
  return data.publicUrl;
};

interface Props {
  topico: MicroTopico;
  index?: number;
}

export const MicroTopicCard = ({ topico, index = 0 }: Props) => {
  const navigate = useNavigate();
  const gradient = GRADIENTS[index % GRADIENTS.length];
  const coverUrl = topico.cover_storage_path ? getCoverUrl(topico.cover_storage_path) : null;

  const pct = topico.total_itens > 0
    ? Math.round((topico.total_concluidos / topico.total_itens) * 100)
    : 0;
  const todosConcluidos = topico.total_itens > 0 && topico.total_concluidos === topico.total_itens;

  return (
    <div
      className="rounded-2xl overflow-hidden shadow-sm hover:shadow-lg transition-all duration-200 cursor-pointer hover:scale-[1.02] bg-white border border-gray-100"
      onClick={() => navigate(`/microaprendizagem/${topico.id}`)}
    >
      {/* Banner: imagem ou gradiente */}
      <div className="relative w-full h-32 overflow-hidden">
        {coverUrl ? (
          <img
            src={coverUrl}
            alt={topico.titulo}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className={`w-full h-full bg-gradient-to-br ${gradient} flex items-center justify-center`}>
            <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center backdrop-blur-sm">
              <BookOpen className="w-7 h-7 text-white" />
            </div>
          </div>
        )}

        {/* Overlay escuro na imagem para legibilidade */}
        {coverUrl && (
          <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
            <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center backdrop-blur-sm">
              <BookOpen className="w-6 h-6 text-white" />
            </div>
          </div>
        )}

        {todosConcluidos && (
          <div className="absolute top-2 right-2">
            <CheckCircle2 className="w-5 h-5 text-white drop-shadow" />
          </div>
        )}

        <div className="absolute bottom-2 left-3">
          <span className="text-xs font-medium text-white/80 drop-shadow">
            {topico.total_itens} {topico.total_itens === 1 ? 'conteúdo' : 'conteúdos'}
          </span>
        </div>
      </div>

      {/* Corpo */}
      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-1">
          <h3 className="text-sm font-bold text-gray-800 leading-tight line-clamp-2">{topico.titulo}</h3>
          <ChevronRight className="w-4 h-4 text-gray-300 shrink-0 mt-0.5" />
        </div>

        {topico.descricao && (
          <p className="text-xs text-gray-400 line-clamp-2 mb-2">{topico.descricao}</p>
        )}

        {/* Progresso */}
        <div className="space-y-1 mt-2">
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
