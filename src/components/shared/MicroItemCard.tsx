import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { ChevronRight } from 'lucide-react';
import { MicroProgressBadge } from '@/components/microaprendizagem/progress/MicroProgressBadge';
import type { MicroItem } from '@/hooks/useMicroItens';
import type { ProgressoStatus } from '@/hooks/useMicroProgresso';

const TIPO_CONFIG: Record<string, { emoji: string; label: string; cor: string }> = {
  video:      { emoji: '🎥', label: 'Vídeo',      cor: 'bg-red-50 border-red-100' },
  audio:      { emoji: '🎙️', label: 'Áudio',      cor: 'bg-orange-50 border-orange-100' },
  podcast:    { emoji: '🎧', label: 'Podcast',    cor: 'bg-blue-50 border-blue-100' },
  microtexto: { emoji: '📄', label: 'Microtexto', cor: 'bg-green-50 border-green-100' },
  infografico:{ emoji: '🖼️', label: 'Infográfico',cor: 'bg-teal-50 border-teal-100' },
  card:       { emoji: '📌', label: 'Card',       cor: 'bg-yellow-50 border-yellow-100' },
  quiz:       { emoji: '❓', label: 'Quiz',       cor: 'bg-purple-50 border-purple-100' },
  flashcard:  { emoji: '🃏', label: 'Flashcard',  cor: 'bg-pink-50 border-pink-100' },
};

interface Props {
  item: MicroItem;
  topicoId: string;
  status: ProgressoStatus;
}

export const MicroItemCard = ({ item, topicoId, status }: Props) => {
  const navigate = useNavigate();
  const config = TIPO_CONFIG[item.tipo] ?? { emoji: '📝', label: item.tipo, cor: 'bg-gray-50 border-gray-100' };

  return (
    <Card
      className={`cursor-pointer hover:shadow-md transition-all border ${config.cor} hover:scale-[1.01]`}
      onClick={() => navigate(`/microaprendizagem/${topicoId}/${item.id}`)}
    >
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <span className="text-2xl shrink-0">{config.emoji}</span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-800 truncate">{item.titulo}</p>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-xs text-gray-400">{config.label}</span>
            </div>
            {item.descricao_curta && (
              <p className="text-xs text-gray-500 mt-1 line-clamp-2">{item.descricao_curta}</p>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <MicroProgressBadge status={status} />
            <ChevronRight className="w-4 h-4 text-gray-300" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
