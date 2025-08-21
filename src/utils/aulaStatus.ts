import { format, parseISO, isAfter, isBefore, isEqual, addHours } from 'date-fns';

type Aula = {
  data_aula: string;       // "2025-08-20" ou "20/08/2025"
  horario_inicio: string;  // "19:00" ou "19:00:00"
  horario_fim: string;     // "20:00" ou "20:00:00"
};

export function computeStatus(aula: Aula): 'agendada' | 'ao_vivo' | 'encerrada' | 'indefinido' {
  try {
    // validação mínima
    if (!aula?.data_aula || !aula?.horario_inicio || !aula?.horario_fim) {
      console.warn('❌ Aula com dados incompletos:', aula);
      return 'indefinido';
    }

    // Normalizar a data para YYYY-MM-DD se vier em DD/MM/YYYY
    let dataFormatada = aula.data_aula;
    if (aula.data_aula.includes('/')) {
      const [day, month, year] = aula.data_aula.split('/');
      dataFormatada = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }

    // Normalizar horários para HH:MM (remover segundos se existir)
    const normalizeTime = (time: string) => {
      const parts = time.split(':');
      return `${parts[0].padStart(2, '0')}:${parts[1].padStart(2, '0')}`;
    };

    const horarioInicioNorm = normalizeTime(aula.horario_inicio);
    const horarioFimNorm = normalizeTime(aula.horario_fim);

    // Criar DateTimes em ISO (assumindo horário local de Brasília UTC-3)
    const startISO = `${dataFormatada}T${horarioInicioNorm}:00-03:00`;
    const endISO = `${dataFormatada}T${horarioFimNorm}:00-03:00`;
    
    // Parse das datas
    const startDate = parseISO(startISO);
    const endDate = parseISO(endISO);
    
    // Data atual
    const now = new Date();
    
    console.log('⏰ Status Calculation:', {
      data_original: aula.data_aula,
      data_formatada: dataFormatada,
      horario_inicio: aula.horario_inicio,
      horario_fim: aula.horario_fim,
      horario_inicio_norm: horarioInicioNorm,
      horario_fim_norm: horarioFimNorm,
      start_iso: startISO,
      end_iso: endISO,
      start_date: format(startDate, 'dd/MM/yyyy HH:mm:ss'),
      end_date: format(endDate, 'dd/MM/yyyy HH:mm:ss'),
      now: format(now, 'dd/MM/yyyy HH:mm:ss'),
      is_before_start: isBefore(now, startDate),
      is_after_start: isAfter(now, startDate) || isEqual(now, startDate),
      is_before_end: isBefore(now, endDate),
    });

    // Lógica de status
    if (isBefore(now, startDate)) {
      console.log('✅ Status: AGENDADA');
      return 'agendada';
    }
    
    if ((isAfter(now, startDate) || isEqual(now, startDate)) && isBefore(now, endDate)) {
      console.log('✅ Status: AO_VIVO');
      return 'ao_vivo';
    }
    
    console.log('✅ Status: ENCERRADA');
    return 'encerrada';
    
  } catch (error) {
    console.error('❌ Erro fatal em computeStatus:', error, aula);
    return 'indefinido';
  }
}

// Função auxiliar para salvar em UTC no banco
export function toUTCISO(aula: Aula) {
  try {
    let dataFormatada = aula.data_aula;
    if (aula.data_aula.includes('/')) {
      const [day, month, year] = aula.data_aula.split('/');
      dataFormatada = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }

    const normalizeTime = (time: string) => {
      const parts = time.split(':');
      return `${parts[0].padStart(2, '0')}:${parts[1].padStart(2, '0')}`;
    };

    const startISO = `${dataFormatada}T${normalizeTime(aula.horario_inicio)}:00-03:00`;
    const endISO = `${dataFormatada}T${normalizeTime(aula.horario_fim)}:00-03:00`;
    
    const startDate = parseISO(startISO);
    const endDate = parseISO(endISO);
    
    return { 
      start_utc: startDate.toISOString(), 
      end_utc: endDate.toISOString() 
    };
  } catch (error) {
    console.error('Erro em toUTCISO:', error);
    return { start_utc: '', end_utc: '' };
  }
}