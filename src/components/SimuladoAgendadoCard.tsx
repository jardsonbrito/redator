import { useState, useEffect } from 'react';
import { Calendar, Clock } from 'lucide-react';
import { computeSimuladoStatus } from '@/utils/simuladoStatus';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import duration from 'dayjs/plugin/duration';

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(duration);

const TZ = 'America/Fortaleza';

interface SimuladoAgendadoCardProps {
  simulado: {
    id: string;
    titulo: string;
    data_inicio: string;
    hora_inicio: string;
    data_fim: string;
    hora_fim: string;
    ativo?: boolean;
  };
  onStatusChange?: () => void;
}

export const SimuladoAgendadoCard = ({ simulado, onStatusChange }: SimuladoAgendadoCardProps) => {
  const [timeLeft, setTimeLeft] = useState<{ days: number; hours: number; minutes: number } | null>(null);

  useEffect(() => {
    const updateCountdown = () => {
      // Verificar se o status ainda é "agendado"
      const currentStatus = computeSimuladoStatus(simulado);
      if (currentStatus !== 'agendado') {
        // Status mudou, disparar atualização
        onStatusChange?.();
        return;
      }

      const now = dayjs.tz(dayjs(), TZ);
      const start = dayjs.tz(`${simulado.data_inicio} ${simulado.hora_inicio}`, 'YYYY-MM-DD HH:mm', TZ);
      
      const diff = start.diff(now);
      
      if (diff <= 0) {
        // Simulado já começou, disparar mudança de status
        onStatusChange?.();
        return;
      }

      const durationObj = dayjs.duration(diff);
      setTimeLeft({
        days: durationObj.days(),
        hours: durationObj.hours(),
        minutes: durationObj.minutes()
      });
    };

    updateCountdown();
    // Atualizar a cada 30 segundos conforme especificado
    const interval = setInterval(updateCountdown, 30000);

    return () => clearInterval(interval);
  }, [simulado, onStatusChange]);

  // Verificação adicional para garantir que só renderiza se for agendado
  const currentStatus = computeSimuladoStatus(simulado);
  if (currentStatus !== 'agendado') {
    return null;
  }

  // Formatação das datas
  const dataInicio = dayjs.tz(`${simulado.data_inicio} ${simulado.hora_inicio}`, 'YYYY-MM-DD HH:mm', TZ);
  const dataFim = dayjs.tz(`${simulado.data_fim} ${simulado.hora_fim}`, 'YYYY-MM-DD HH:mm', TZ);

  const formatarDataHora = (data: dayjs.Dayjs) => {
    const dia = data.date();
    const meses = [
      'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
      'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'
    ];
    const mes = meses[data.month()];
    const hora = data.hour();
    
    return `${dia} de ${mes} às ${hora} horas`;
  };

  if (!timeLeft) {
    return null; // Componente será recarregado com novo status
  }

  return (
    <article className="w-full" aria-label={`Simulado: ${simulado.titulo}`} role="article">
      <Card className="rounded-2xl border shadow-sm bg-card transition-shadow hover:shadow-md">
        <CardContent className="p-4 lg:p-6">
          <div className="flex flex-col gap-4">
            {/* Timer ocupando exatamente o mesmo espaço que a imagem (aspect-video 16:9) */}
            <div className="relative w-full aspect-video overflow-hidden rounded-xl bg-primary transition-transform hover:scale-[1.02] group">
              <div className="absolute inset-0 h-full w-full bg-primary text-primary-foreground flex flex-col items-center justify-center px-4">
                <span className="text-sm font-medium mb-4">Faltam:</span>
                <div className="flex items-center justify-center gap-3 lg:gap-4" aria-live="polite">
                  <div className="text-center">
                    <div className="text-3xl lg:text-4xl font-bold tabular-nums leading-none">
                      {timeLeft.days}
                    </div>
                    <div className="text-xs opacity-80 mt-1">dias</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl lg:text-4xl font-bold tabular-nums leading-none">
                      {timeLeft.hours}
                    </div>
                    <div className="text-xs opacity-80 mt-1">horas</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl lg:text-4xl font-bold tabular-nums leading-none">
                      {timeLeft.minutes}
                    </div>
                    <div className="text-xs opacity-80 mt-1">min</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Info - replicando exatamente o UnifiedCard */}
            <div className="flex flex-col gap-3">
              {/* Badge */}
              <div className="flex flex-wrap items-center gap-2" aria-label="marcadores">
                <Badge
                  variant="secondary"
                  className="inline-flex items-center px-2.5 py-0.5 text-xs font-medium leading-tight"
                >
                  Agendado
                </Badge>
              </div>

              {/* Título */}
              <h3 className="text-xl lg:text-2xl font-semibold leading-tight line-clamp-2">
                {simulado.titulo}
              </h3>

              {/* Meta - informações de data/hora */}
              <ul className="flex flex-wrap gap-4 mt-1 text-sm text-muted-foreground">
                <li className="flex items-center gap-1.5">
                  <Calendar className="h-4 w-4" aria-hidden="true" />
                  <span>Início: {formatarDataHora(dataInicio)}</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <Clock className="h-4 w-4" aria-hidden="true" />
                  <span>Fim: {formatarDataHora(dataFim)}</span>
                </li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </article>
  );
};