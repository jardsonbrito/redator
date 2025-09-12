/**
 * Utilitários para lidar com datas e timezone
 */

import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

/**
 * Converte uma data do input HTML (YYYY-MM-DD) para formato ISO sem problemas de timezone
 * Adiciona horário do meio-dia (12:00) para evitar problemas de fuso horário
 */
export function formatDateForDatabase(dateString: string): string {
  if (!dateString) return dateString;
  
  // Adiciona horário do meio-dia para evitar problemas de timezone
  const date = new Date(dateString + 'T12:00:00');
  return date.toISOString().split('T')[0];
}

/**
 * Obter a data atual no formato YYYY-MM-DD considerando o fuso horário local
 */
export function getTodayLocalDate(): string {
  const now = new Date();
  // Ajusta para timezone local
  const localDate = new Date(now.getTime() - (now.getTimezoneOffset() * 60000));
  return localDate.toISOString().split('T')[0];
}

/**
 * Formatar data do banco (que pode ter problemas de timezone) para exibição no input
 */
export function formatDateFromDatabase(dateString: string): string {
  if (!dateString) return dateString;
  
  // Se já está no formato correto, retorna
  if (dateString.length === 10 && dateString.includes('-')) {
    return dateString;
  }
  
  // Se é ISO string completa, extrai apenas a data
  return dateString.split('T')[0];
}

/**
 * Formatar data para exibição no formato brasileiro (dd/MM/yyyy)
 * Corrige problemas de timezone automaticamente
 */
export function formatDateForDisplay(dateString: string): string {
  if (!dateString) return '';
  
  // Se é uma string no formato YYYY-MM-DD, adiciona horário para evitar timezone issues
  const normalizedDate = dateString.includes('T') ? dateString : dateString + 'T12:00:00';
  return format(new Date(normalizedDate), 'dd/MM/yyyy', { locale: ptBR });
}

/**
 * Converter string de data para objeto Date com timezone corrigido
 * Útil para comparações de data
 */
export function parseDateSafely(dateString: string): Date {
  if (!dateString) return new Date();
  
  // Se é uma string no formato YYYY-MM-DD, adiciona horário para evitar timezone issues
  const normalizedDate = dateString.includes('T') ? dateString : dateString + 'T12:00:00';
  return new Date(normalizedDate);
}