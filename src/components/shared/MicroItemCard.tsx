import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { ChevronRight, PlaySquare, FileText, StickyNote, AudioWaveform, Mic, Brain, GalleryHorizontalEnd, Image, type LucideIcon } from 'lucide-react';
import { MicroProgressBadge } from '@/components/microaprendizagem/progress/MicroProgressBadge';
import type { MicroItem } from '@/hooks/useMicroItens';
import type { ProgressoStatus } from '@/hooks/useMicroProgresso';

interface TipoConfig {
  icon: LucideIcon;
  label: string;
  iconBg: string;
  iconColor: string;
  cardBorder: string;
}

const TIPO_CONFIG: Record<string, TipoConfig> = {
  video:       { icon: PlaySquare,           label: 'Vídeo',       iconBg: 'bg-gray-800',    iconColor: 'text-white',      cardBorder: 'border-gray-200' },
  microtexto:  { icon: FileText,             label: 'Microtexto',  iconBg: 'bg-green-100',   iconColor: 'text-green-700',  cardBorder: 'border-green-100' },
  card:        { icon: StickyNote,           label: 'Card',        iconBg: 'bg-amber-100',   iconColor: 'text-amber-600',  cardBorder: 'border-amber-100' },
  audio:       { icon: AudioWaveform,        label: 'Áudio',       iconBg: 'bg-slate-100',   iconColor: 'text-slate-700',  cardBorder: 'border-slate-200' },
  podcast:     { icon: Mic,                  label: 'Podcast',     iconBg: 'bg-slate-100',   iconColor: 'text-slate-600',  cardBorder: 'border-slate-200' },
  quiz:        { icon: Brain,                label: 'Quiz',        iconBg: 'bg-purple-100',  iconColor: 'text-purple-700', cardBorder: 'border-purple-100' },
  flashcard:   { icon: GalleryHorizontalEnd, label: 'Flashcard',   iconBg: 'bg-blue-100',    iconColor: 'text-blue-700',   cardBorder: 'border-blue-100' },
  infografico: { icon: Image,                label: 'Infográfico', iconBg: 'bg-teal-100',    iconColor: 'text-teal-700',   cardBorder: 'border-teal-100' },
};

const DEFAULT_CONFIG: TipoConfig = { icon: FileText, label: 'Conteúdo', iconBg: 'bg-gray-100', iconColor: 'text-gray-600', cardBorder: 'border-gray-100' };

interface Props {
  item: MicroItem;
  topicoId: string;
  status: ProgressoStatus;
}

export const MicroItemCard = ({ item, topicoId, status }: Props) => {
  const navigate = useNavigate();
  const config = TIPO_CONFIG[item.tipo] ?? DEFAULT_CONFIG;
  const Icon = config.icon;

  return (
    <Card
      className={`cursor-pointer hover:shadow-md transition-all border ${config.cardBorder} bg-white hover:scale-[1.01]`}
      onClick={() => navigate(`/microaprendizagem/${topicoId}/${item.id}`)}
    >
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${config.iconBg}`}>
            <Icon className={`w-6 h-6 ${config.iconColor}`} />
          </div>
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
