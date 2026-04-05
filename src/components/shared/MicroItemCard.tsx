import { useNavigate } from 'react-router-dom';
import { PlaySquare, FileText, StickyNote, AudioWaveform, Mic, Brain, GalleryHorizontalEnd, Image, type LucideIcon } from 'lucide-react';
import { MicroProgressBadge } from '@/components/microaprendizagem/progress/MicroProgressBadge';
import type { MicroItem } from '@/hooks/useMicroItens';
import type { ProgressoStatus } from '@/hooks/useMicroProgresso';

interface TipoConfig {
  icon: LucideIcon;
  label: string;
  iconBg: string;
  iconColor: string;
  bannerBg: string;
}

const TIPO_CONFIG: Record<string, TipoConfig> = {
  video:       { icon: PlaySquare,           label: 'Vídeo',       iconBg: 'bg-white/20', iconColor: 'text-white', bannerBg: 'bg-gray-800' },
  microtexto:  { icon: FileText,             label: 'Microtexto',  iconBg: 'bg-white/30', iconColor: 'text-white', bannerBg: 'bg-emerald-500' },
  card:        { icon: StickyNote,           label: 'Card',        iconBg: 'bg-white/30', iconColor: 'text-white', bannerBg: 'bg-amber-400' },
  audio:       { icon: AudioWaveform,        label: 'Áudio',       iconBg: 'bg-white/20', iconColor: 'text-white', bannerBg: 'bg-slate-500' },
  podcast:     { icon: Mic,                  label: 'Podcast',     iconBg: 'bg-white/20', iconColor: 'text-white', bannerBg: 'bg-slate-600' },
  quiz:        { icon: Brain,                label: 'Quiz',        iconBg: 'bg-white/20', iconColor: 'text-white', bannerBg: 'bg-violet-600' },
  flashcard:   { icon: GalleryHorizontalEnd, label: 'Flashcard',   iconBg: 'bg-white/20', iconColor: 'text-white', bannerBg: 'bg-blue-500' },
  infografico: { icon: Image,                label: 'Infográfico', iconBg: 'bg-white/20', iconColor: 'text-white', bannerBg: 'bg-teal-500' },
};

const DEFAULT_CONFIG: TipoConfig = { icon: FileText, label: 'Conteúdo', iconBg: 'bg-white/20', iconColor: 'text-white', bannerBg: 'bg-gray-500' };

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
    <div
      className="rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer hover:scale-[1.02] bg-white border border-gray-100"
      onClick={() => navigate(`/microaprendizagem/${topicoId}/${item.id}`)}
    >
      {/* Banner com ícone */}
      <div className={`${config.bannerBg} flex items-center justify-center py-6 relative`}>
        <div className={`w-12 h-12 rounded-xl ${config.iconBg} flex items-center justify-center backdrop-blur-sm`}>
          <Icon className={`w-6 h-6 ${config.iconColor}`} />
        </div>
        <div className="absolute top-2 right-2">
          <MicroProgressBadge status={status} size="sm" />
        </div>
      </div>

      {/* Corpo */}
      <div className="p-3">
        <p className="text-xs font-bold text-gray-800 leading-tight line-clamp-2 mb-0.5">{item.titulo}</p>
        <p className="text-xs text-gray-400">{config.label}</p>
        {item.descricao_curta && (
          <p className="text-xs text-gray-400 mt-1 line-clamp-2">{item.descricao_curta}</p>
        )}
      </div>
    </div>
  );
};
