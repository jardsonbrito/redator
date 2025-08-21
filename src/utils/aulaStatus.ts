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
    console.log('🔍 ComputeStatus Debug:', {
      TZ: 'America/Sao_Paulo',
      data_aula: aula.data_aula,
      horario_inicio: aula.horario_inicio,
      horario_fim: aula.horario_fim,
      start_timestamp: start.unix(),
      end_timestamp: end.unix(),
      now_timestamp: now.unix(),
      start_formatted: start.format('DD/MM/YYYY HH:mm:ss'),
      end_formatted: end.format('DD/MM/YYYY HH:mm:ss'),
      now_formatted: now.format('DD/MM/YYYY HH:mm:ss'),
      is_before_start: now.isBefore(start),
      is_before_end: now.isBefore(end),
      is_after_start: now.isAfter(start) || now.isSame(start),
      status_computed: now.isBefore(start) ? 'agendada' : (now.isAfter(start) || now.isSame(start)) && now.isBefore(end) ? 'ao_vivo' : 'encerrada'
    });

    // Lógica corrigida - usar isAfter/isSame para ser mais preciso
    if (now.isBefore(start)) {
      console.log('✅ Status: AGENDADA (antes do início)');
      return 'agendada';
    }
    
    if ((now.isAfter(start) || now.isSame(start)) && now.isBefore(end)) {
      console.log('✅ Status: AO_VIVO (durante a aula)');
      return 'ao_vivo';
    }
    
    console.log('✅ Status: ENCERRADA (após o fim)');
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