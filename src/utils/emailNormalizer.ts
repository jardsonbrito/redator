
/**
 * Utilitário para normalização consistente de e-mails
 * Implementa as regras especificadas para evitar problemas de login
 */

export const normalizeEmail = (email: string): string => {
  if (!email || typeof email !== 'string') {
    return '';
  }

  // Aplicar .trim() para remover espaços + .toLowerCase() para minúsculas
  return email.trim().toLowerCase();
};

export const validateEmailFormat = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const logLoginAttempt = (originalEmail: string, normalized: string, result: 'success' | 'not_found' | 'error') => {
  const timestamp = new Date().toISOString();
  
  console.log('🔐 LOGIN ATTEMPT:');
  console.log(`📧 Original: "${originalEmail}"`);
  console.log(`📧 Normalized: "${normalized}"`);
  console.log(`📊 Result: ${result}`);
  console.log(`🕒 Time: ${timestamp}`);
  console.log('---');
};
