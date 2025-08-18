import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

dayjs.extend(utc);
dayjs.extend(timezone);

const TZ = 'America/Fortaleza'; // Brazil/Fortaleza timezone

type Simulado = {
  data_inicio: string;  // "2025-08-18"
  hora_inicio: string;  // "12:00"
  data_fim: string;     // "2025-08-19"
  hora_fim: string;     // "12:40"
  ativo?: boolean;      // campo admin ativo/inativo
};

export type SimuladoStatus = 'agendado' | 'ativo' | 'encerrado' | 'indefinido';

export function computeSimuladoStatus(simulado: Simulado): SimuladoStatus {
  // Validação mínima
  if (!simulado?.data_inicio || !simulado?.hora_inicio || !simulado?.data_fim || !simulado?.hora_fim) {
    console.warn('Simulado com dados incompletos:', simulado);
    return 'indefinido';
  }

  // Se administrativamente desativado, considerar encerrado
  if (simulado.ativo === false) {
    return 'encerrado';
  }

  // Parse das datas no timezone correto (YYYY-MM-DD HH:mm)
  const start = dayjs.tz(`${simulado.data_inicio} ${simulado.hora_inicio}`, 'YYYY-MM-DD HH:mm', TZ);
  const end = dayjs.tz(`${simulado.data_fim} ${simulado.hora_fim}`, 'YYYY-MM-DD HH:mm', TZ);
  
  if (!start.isValid() || !end.isValid()) {
    console.error('Datas de simulado inválidas', { 
      simulado, 
      start: start.toString(), 
      end: end.toString() 
    });
    return 'indefinido';
  }

  const now = dayjs.tz(dayjs(), TZ);

  // Debug para acompanhar o cálculo
  console.table({
    TZ: 'America/Fortaleza',
    data_inicio: simulado.data_inicio,
    hora_inicio: simulado.hora_inicio,
    data_fim: simulado.data_fim,
    hora_fim: simulado.hora_fim,
    start_local: start.format(),
    end_local: end.format(),
    now_local: now.format(),
    status_computed: now.isBefore(start) ? 'agendado' : now.isBefore(end) ? 'ativo' : 'encerrado',
  });

  if (now.isBefore(start)) return 'agendado';
  if (now.isBefore(end)) return 'ativo';
  return 'encerrado';
}

// Função para converter status em labels e tones para UI
export function getSimuladoStatusInfo(status: SimuladoStatus, simulado: Simulado) {
  const start = dayjs.tz(`${simulado.data_inicio} ${simulado.hora_inicio}`, 'YYYY-MM-DD HH:mm', TZ);
  const end = dayjs.tz(`${simulado.data_fim} ${simulado.hora_fim}`, 'YYYY-MM-DD HH:mm', TZ);

  switch (status) {
    case 'agendado':
      return {
        label: 'Agendado',
        tone: 'neutral' as const,
        isActive: false,
        timeInfo: start.isValid() ? `Inicia em ${start.format("DD/MM 'às' HH:mm")}` : '',
      };
    case 'ativo':
      return {
        label: 'Em andamento',
        tone: 'success' as const,
        isActive: true,
        timeInfo: end.isValid() ? `Termina em ${end.format("DD/MM 'às' HH:mm")}` : '',
      };
    case 'encerrado':
      return {
        label: 'Encerrado',
        tone: 'warning' as const,
        isActive: false,
        timeInfo: '',
      };
    case 'indefinido':
    default:
      return {
        label: 'Indefinido',
        tone: 'neutral' as const,
        isActive: false,
        timeInfo: '',
      };
  }
}

// Para compatibilidade com admin (rótulos diferentes)
export function getAdminStatusInfo(status: SimuladoStatus) {
  switch (status) {
    case 'agendado':
      return { status: 'Agendado', color: 'bg-blue-500' };
    case 'ativo':
      return { status: 'Ativo', color: 'bg-green-500' };
    case 'encerrado':
      return { status: 'Encerrado', color: 'bg-gray-500' };
    case 'indefinido':
    default:
      return { status: 'Indefinido', color: 'bg-gray-400' };
  }
}