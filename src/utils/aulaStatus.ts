import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

dayjs.extend(utc);
dayjs.extend(timezone);

const TZ = 'America/Sao_Paulo';

type Aula = {
  data_aula: string;       // "16/08/2025"
  horario_inicio: string;  // "19:00"
  horario_fim: string;     // "20:00"
};

export function computeStatus(aula: Aula): 'agendada' | 'ao_vivo' | 'encerrada' | 'indefinido' {
  try {
    // validação mínima
    if (!aula?.data_aula || !aula?.horario_inicio || !aula?.horario_fim) {
      console.warn('Aula com dados incompletos:', aula);
      return 'indefinido';
    }

    // Validação adicional de formato
    const dateRegex = /^\d{2}\/\d{2}\/\d{4}$/;
    const timeRegex = /^\d{2}:\d{2}$/;
    
    if (!dateRegex.test(aula.data_aula)) {
      console.warn('Formato de data inválido para computeStatus:', aula.data_aula);
      return 'indefinido';
    }
    
    if (!timeRegex.test(aula.horario_inicio) || !timeRegex.test(aula.horario_fim)) {
      console.warn('Formato de horário inválido para computeStatus:', { inicio: aula.horario_inicio, fim: aula.horario_fim });
      return 'indefinido';
    }

    // Parse robusto em TZ local (DD/MM/YYYY HH:mm)
    const start = dayjs.tz(`${aula.data_aula} ${aula.horario_inicio}`, 'DD/MM/YYYY HH:mm', TZ);
    const end   = dayjs.tz(`${aula.data_aula} ${aula.horario_fim}`,   'DD/MM/YYYY HH:mm', TZ);
    
    if (!start.isValid() || !end.isValid()) {
      console.error('Datas inválidas após parse dayjs:', { 
        aula, 
        start: start.toString(), 
        end: end.toString(),
        start_valid: start.isValid(),
        end_valid: end.isValid()
      });
      return 'indefinido';
    }

  const now = dayjs.tz(dayjs(), TZ);

  // Debug detalhado
  console.table({
    TZ: 'America/Sao_Paulo',
    data_aula: aula.data_aula,
    horario_inicio: aula.horario_inicio,
    horario_fim: aula.horario_fim,
    start_local: start.format(),
    end_local: end.format(),
    now_local: now.format(),
    status_computed: now.isBefore(start) ? 'agendada' : now.isBefore(end) ? 'ao_vivo' : 'encerrada',
  });

    if (now.isBefore(start)) return 'agendada';
    if (now.isBefore(end))   return 'ao_vivo';
    return 'encerrada';
  } catch (error) {
    console.error('Erro fatal em computeStatus:', error, aula);
    return 'indefinido';
  }
}

// (opcional) para salvar em UTC no banco
export function toUTCISO(aula: Aula) {
  const start = dayjs.tz(`${aula.data_aula} ${aula.horario_inicio}`, 'DD/MM/YYYY HH:mm', TZ).utc().toISOString();
  const end   = dayjs.tz(`${aula.data_aula} ${aula.horario_fim}`,   'DD/MM/YYYY HH:mm', TZ).utc().toISOString();
  return { start_utc: start, end_utc: end };
}