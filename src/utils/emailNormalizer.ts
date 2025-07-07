
export const normalizeEmail = (email: string): string => {
  return email.trim().toLowerCase();
};

export const logLoginAttempt = (originalEmail: string, normalizedEmail: string, result: 'success' | 'not_found' | 'error') => {
  console.log(`🔍 LOGIN ATTEMPT - Original: ${originalEmail}, Normalized: ${normalizedEmail}, Result: ${result}`);
};
