import { useState, useEffect } from 'react';
import { Calendar, Clock } from 'lucide-react';
import { computeSimuladoStatus } from '@/utils/simuladoStatus';
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
    <div className="w-full bg-white rounded-3xl shadow-lg overflow-hidden">
      {/* Layout mobile: faixa horizontal no topo */}
      <div className="block md:hidden">
        <div className="bg-primary text-primary-foreground px-6 py-4 flex items-center justify-between">
          <span className="text-sm font-medium">Faltam:</span>
          <div className="flex items-center gap-2 text-2xl font-bold" aria-live="polite">
            <span className="tabular-nums">{timeLeft.days}d</span>
            <span className="tabular-nums">{timeLeft.hours}h</span>
            <span className="tabular-nums">{timeLeft.minutes}m</span>
          </div>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <h2 className="text-2xl font-bold text-foreground mb-3">
              {simulado.titulo}
            </h2>
            <span 
              className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-primary/10 text-primary"
              aria-label="Status: Agendado"
            >
              Agendado
            </span>
          </div>
          
          <div className="space-y-3 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4" aria-hidden="true" />
              <span>Início: {formatarDataHora(dataInicio)}</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4" aria-hidden="true" />
              <span>Fim: {formatarDataHora(dataFim)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Layout desktop: grid com faixa lateral */}
      <div className="hidden md:grid md:grid-cols-[1fr_0.3fr] min-h-[200px]">
        {/* Conteúdo principal */}
        <div className="p-8 lg:p-10 flex flex-col justify-center space-y-6">
          <div>
            <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-4 leading-tight">
              {simulado.titulo}
            </h2>
            <span 
              className="inline-flex items-center px-4 py-2 rounded-full text-sm font-medium bg-primary/10 text-primary"
              aria-label="Status: Agendado"
            >
              Agendado
            </span>
          </div>
          
          <div className="space-y-4 text-base text-muted-foreground">
            <div className="flex items-center gap-3">
              <Calendar className="w-5 h-5" aria-hidden="true" />
              <span>Início: {formatarDataHora(dataInicio)}</span>
            </div>
            <div className="flex items-center gap-3">
              <Clock className="w-5 h-5" aria-hidden="true" />
              <span>Fim: {formatarDataHora(dataFim)}</span>
            </div>
          </div>
        </div>

        {/* Faixa lateral roxa */}
        <div className="bg-primary text-primary-foreground rounded-r-3xl flex flex-col items-center justify-center px-4 py-8">
          <span className="text-lg font-medium mb-4">Faltam:</span>
          <div className="text-center space-y-2" aria-live="polite">
            <div className="text-5xl lg:text-6xl font-bold tabular-nums">
              {timeLeft.days}d
            </div>
            <div className="text-5xl lg:text-6xl font-bold tabular-nums">
              {timeLeft.hours}h
            </div>
            <div className="text-5xl lg:text-6xl font-bold tabular-nums">
              {timeLeft.minutes}m
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};