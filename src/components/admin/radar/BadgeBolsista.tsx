import { GraduationCap } from 'lucide-react';
import type { StatusBolsista } from '@/utils/radarScore';

interface BadgeBolsistaProps {
  status: StatusBolsista;
}

export function BadgeBolsista({ status }: BadgeBolsistaProps) {
  if (!status.isBolsista) return null;

  const cor = status.cor ?? '#d97706';

  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold border"
      style={{
        color:           cor,
        borderColor:     cor,
        backgroundColor: `${cor}18`,
      }}
    >
      <GraduationCap className="h-3 w-3" />
      {status.label}
    </span>
  );
}
