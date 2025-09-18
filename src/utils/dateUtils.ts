/**
 * Utilitários para manipulação segura de datas
 * Evita problemas de fuso horário ao trabalhar com datas no formato YYYY-MM-DD
 */

/**
 * Formatar uma data no formato YYYY-MM-DD para exibição em português brasileiro
 * sem problemas de fuso horário
 */
export const formatDateSafe = (dateString: string | null | undefined): string => {
  if (!dateString) return '-';

  try {
    // Parse manual da data para evitar problemas de timezone
    const [year, month, day] = dateString.split('-').map(Number);

    if (!year || !month || !day) {
      console.warn('Data inválida:', dateString);
      return '-';
    }

    // Formatar manualmente para pt-BR sem usar Date para evitar timezone
    const dayFormatted = day.toString().padStart(2, '0');
    const monthFormatted = month.toString().padStart(2, '0');

    return `${dayFormatted}/${monthFormatted}/${year}`;
  } catch (error) {
    console.error('Erro ao formatar data:', dateString, error);
    return '-';
  }
};

/**
 * Verificar se uma data (string YYYY-MM-DD) é maior ou igual à data atual
 * sem problemas de fuso horário
 */
export const isDateActiveOrFuture = (dateString: string | null | undefined): boolean => {
  if (!dateString) return false;

  try {
    // Parse manual da data para evitar problemas de timezone
    const [year, month, day] = dateString.split('-').map(Number);

    if (!year || !month || !day) {
      console.warn('Data inválida para comparação:', dateString);
      return false;
    }

    // Criar data local sem conversão de timezone
    const targetDate = new Date(year, month - 1, day);

    // Data atual também local, zerando horas
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return targetDate >= today;
  } catch (error) {
    console.error('Erro ao comparar data:', dateString, error);
    return false;
  }
};

/**
 * Calcular quantos dias restam até uma data de validade
 */
export const getDaysUntilExpiration = (dateString: string | null | undefined): number => {
  if (!dateString) return -1;

  try {
    const [year, month, day] = dateString.split('-').map(Number);

    if (!year || !month || !day) {
      console.warn('Data inválida para calcular dias:', dateString);
      return -1;
    }

    const targetDate = new Date(year, month - 1, day);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const diffTime = targetDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    return diffDays;
  } catch (error) {
    console.error('Erro ao calcular dias até expiração:', dateString, error);
    return -1;
  }
};

/**
 * Formatar data e hora completa para exibição (usado em históricos)
 */
export const formatDateTimeSafe = (dateTimeString: string | null | undefined): string => {
  if (!dateTimeString) return '-';

  try {
    const date = new Date(dateTimeString);
    return date.toLocaleString('pt-BR', {
      timeZone: 'America/Sao_Paulo',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch (error) {
    console.error('Erro ao formatar data/hora:', dateTimeString, error);
    return '-';
  }
};

/**
 * Converter data do formato DD/MM/YYYY para YYYY-MM-DD (formato do banco de dados)
 */
export const formatDateForDatabase = (dateString: string | null | undefined): string => {
  if (!dateString) return '';

  try {
    // Se já estiver no formato YYYY-MM-DD, retorna como está
    if (dateString.match(/^\d{4}-\d{2}-\d{2}$/)) {
      return dateString;
    }

    // Parse DD/MM/YYYY
    const [day, month, year] = dateString.split('/').map(Number);

    if (!day || !month || !year) {
      console.warn('Data inválida para conversão para banco:', dateString);
      return '';
    }

    const dayFormatted = day.toString().padStart(2, '0');
    const monthFormatted = month.toString().padStart(2, '0');

    return `${year}-${monthFormatted}-${dayFormatted}`;
  } catch (error) {
    console.error('Erro ao converter data para banco:', dateString, error);
    return '';
  }
};

/**
 * Converter data do formato YYYY-MM-DD (banco de dados) para DD/MM/YYYY
 */
export const formatDateFromDatabase = (dateString: string | null | undefined): string => {
  return formatDateSafe(dateString);
};

/**
 * Formatar data para exibição (alias para formatDateSafe)
 */
export const formatDateForDisplay = formatDateSafe;

/**
 * Parse seguro de data no formato YYYY-MM-DD retornando objeto Date
 */
export const parseDateSafely = (dateString: string | null | undefined): Date | null => {
  if (!dateString) return null;

  try {
    const [year, month, day] = dateString.split('-').map(Number);

    if (!year || !month || !day) {
      console.warn('Data inválida para parse:', dateString);
      return null;
    }

    // Criar data local sem conversão de timezone
    return new Date(year, month - 1, day);
  } catch (error) {
    console.error('Erro ao fazer parse da data:', dateString, error);
    return null;
  }
};

/**
 * Obter data atual no formato YYYY-MM-DD sem problemas de timezone
 */
export const getTodayLocalDate = (): string => {
  const today = new Date();
  const year = today.getFullYear();
  const month = (today.getMonth() + 1).toString().padStart(2, '0');
  const day = today.getDate().toString().padStart(2, '0');

  return `${year}-${month}-${day}`;
};
