import { BadgeCheck } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SeloValidacaoENEMProps {
  /** Ano da banca. Se omitido ou nulo, usa o ano corrente. */
  ano?: number | null;
  className?: string;
}

/**
 * Selo visual que indica que a redação exemplar foi revisada e está alinhada
 * às exigências da Banca Examinadora do ENEM para o ano informado.
 */
export const SeloValidacaoENEM = ({ ano, className }: SeloValidacaoENEMProps) => {
  const anoExibido = ano ?? new Date().getFullYear();

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full',
        'bg-green-50 border border-green-200',
        'text-green-700 text-xs font-semibold whitespace-nowrap',
        className
      )}
    >
      <BadgeCheck className="w-3.5 h-3.5 text-green-600 flex-shrink-0" aria-hidden="true" />
      Redação validada para o ENEM {anoExibido}
    </span>
  );
};
