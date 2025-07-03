/**
 * Utilitários para normalização e comparação de turmas
 */

/**
 * Extrai a letra da turma de uma string, ignorando caracteres especiais
 */
export const extractTurmaLetter = (turma: string): string | null => {
  if (!turma) return null;
  
  // Remove caracteres especiais e normaliza
  const normalized = turma.trim().replace(/\s+/g, ' ').replace(/[^\w\s]/g, '');
  
  // Extrai a letra da turma (A, B, C, D, E)
  const match = normalized.match(/Turma\s*([A-E])/i);
  return match?.[1]?.toUpperCase() || null;
};

/**
 * Compara duas turmas de forma tolerante a caracteres invisíveis
 */
export const compareTurmas = (turma1: string, turma2: string): boolean => {
  const letra1 = extractTurmaLetter(turma1);
  const letra2 = extractTurmaLetter(turma2);
  
  return letra1 === letra2 && letra1 !== null;
};

/**
 * Normaliza o nome da turma para o formato padrão
 */
export const normalizeTurmaName = (turma: string): string => {
  const letra = extractTurmaLetter(turma);
  return letra ? `Turma ${letra}` : turma;
};