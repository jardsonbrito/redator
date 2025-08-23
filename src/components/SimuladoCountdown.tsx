import { useState, useEffect } from 'react';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import duration from 'dayjs/plugin/duration';

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(duration);

const TZ = 'America/Fortaleza';

interface SimuladoCountdownProps {
  dataInicio: string;
  horaInicio: string;
}

export const SimuladoCountdown = ({ dataInicio, horaInicio }: SimuladoCountdownProps) => {
  const [timeLeft, setTimeLeft] = useState<string>('');

  useEffect(() => {
    const updateCountdown = () => {
      const now = dayjs.tz(dayjs(), TZ);
      const start = dayjs.tz(`${dataInicio} ${horaInicio}`, 'YYYY-MM-DD HH:mm', TZ);
      
      const diff = start.diff(now);
      
      if (diff <= 0) {
        setTimeLeft('Iniciando...');
        return;
      }

      const duration = dayjs.duration(diff);
      const days = duration.days();
      const hours = duration.hours();
      const minutes = duration.minutes();
      const seconds = duration.seconds();

      // Se faltar menos de 1 hora, mostrar segundos
      if (days === 0 && hours === 0) {
        setTimeLeft(`Começa em ${minutes}min ${seconds}s`);
      } else {
        setTimeLeft(`Começa em ${days}d ${hours}h ${minutes}min`);
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);

    return () => clearInterval(interval);
  }, [dataInicio, horaInicio]);

  return (
    <div className="text-center py-8">
      <div className="text-2xl font-bold text-primary mb-2">{timeLeft}</div>
      <div className="text-sm text-muted-foreground">Contagem regressiva</div>
    </div>
  );
};