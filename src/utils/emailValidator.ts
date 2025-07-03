
/**
 * Utilitário para normalização e validação robusta de e-mails
 * Resolve problemas de inconsistência entre dispositivos
 */

export const normalizeEmail = (email: string): string => {
  if (!email || typeof email !== 'string') {
    return '';
  }

  return email
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '') // Remove todos os espaços
    .replace(/[^\w@.-]/g, ''); // Remove caracteres especiais invisíveis
};

export const validateEmailFormat = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const logLoginAttempt = (email: string, device: string = 'unknown') => {
  const timestamp = new Date().toISOString();
  const userAgent = navigator.userAgent;
  
  console.log('🔐 LOGIN ATTEMPT LOG:');
  console.log(`📧 Email: ${email}`);
  console.log(`📧 Normalized: ${normalizeEmail(email)}`);
  console.log(`📱 Device: ${device}`);
  console.log(`🕒 Timestamp: ${timestamp}`);
  console.log(`🌐 User Agent: ${userAgent}`);
  console.log('---');
};
