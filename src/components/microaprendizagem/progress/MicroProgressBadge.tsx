import { CheckCircle2, Clock, Circle } from 'lucide-react';
import type { ProgressoStatus } from '@/hooks/useMicroProgresso';

interface Props {
  status: ProgressoStatus;
  size?: 'sm' | 'md';
}

export const MicroProgressBadge = ({ status, size = 'sm' }: Props) => {
  const cls = size === 'md' ? 'w-5 h-5' : 'w-4 h-4';

  if (status === 'concluido') {
    return <CheckCircle2 className={`${cls} text-green-500 shrink-0`} />;
  }
  if (status === 'em_andamento') {
    return <Clock className={`${cls} text-yellow-500 shrink-0`} />;
  }
  return <Circle className={`${cls} text-gray-300 shrink-0`} />;
};
