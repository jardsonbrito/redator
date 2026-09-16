import type { FaixaConfig, TendenciaConfig } from '@/config/radarConfig';

interface TendenciaInfo extends TendenciaConfig { delta: number }

interface BadgeStatusProps {
  faixa:     FaixaConfig | null;
  tendencia: TendenciaInfo | null;
  score:     number | null;
  size?:     'sm' | 'md';
}

export function BadgeStatus({ faixa, tendencia, score, size = 'sm' }: BadgeStatusProps) {
  if (!faixa || score === null) {
    return (
      <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-500">
        Sem dados
      </span>
    );
  }

  const px = size === 'md' ? 'px-2.5 py-1' : 'px-2 py-0.5';

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full ${px} text-xs font-semibold`}
      style={{ backgroundColor: faixa.bg, color: faixa.corTexto }}
    >
      {faixa.label}
      {tendencia && (
        <span style={{ color: tendencia.cor }} className="font-bold">
          {tendencia.icone}
        </span>
      )}
    </span>
  );
}

interface BadgeScoreProps {
  score: number | null;
  cor:   string;
}

export function BadgeScore({ score, cor }: BadgeScoreProps) {
  if (score === null) return <span className="text-xs text-muted-foreground">—</span>;
  return (
    <span className="text-sm font-bold tabular-nums" style={{ color: cor }}>
      {score.toFixed(1)}
    </span>
  );
}
