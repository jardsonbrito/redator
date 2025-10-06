/**
 * Utilitários para normalização e comparação de turmas
 *
 * PADRÃO ADOTADO:
 * - Armazenamento: apenas letras "A", "B", "C", "D", "E" ou "VISITANTE"
 * - Exibição: "Turma A", "Turma B", etc. (formatado dinamicamente)
 */

/**
 * Tipos válidos de turma
 */
export type TurmaLetra = 'A' | 'B' | 'C' | 'D' | 'E' | 'VISITANTE';

/**
 * Lista de turmas válidas (exceto VISITANTE)
 */
export const TURMAS_VALIDAS: readonly TurmaLetra[] = ['A', 'B', 'C', 'D', 'E'] as const;

/**
 * Todas as turmas possíveis incluindo VISITANTE
 */
export const TODAS_TURMAS: readonly TurmaLetra[] = [...TURMAS_VALIDAS, 'VISITANTE'] as const;

/**
 * Normaliza qualquer formato de turma para letra única
 *
 * Aceita formatos:
 * - "TURMA A", "Turma A", "turma a" → "A"
 * - "LRA 2025", "LRB 2025" → "A", "B" (formato legado)
 * - "A", "B", "C" → "A", "B", "C"
 * - "visitante", "VISITANTE" → "VISITANTE"
 *
 * @param turma - String com nome da turma em qualquer formato
 * @returns Letra normalizada ou null se inválido
 *
 * @example
 * normalizeTurmaToLetter("TURMA A")  // → "A"
 * normalizeTurmaToLetter("Turma B")  // → "B"
 * normalizeTurmaToLetter("LRA 2025") // → "A"
 * normalizeTurmaToLetter("visitante") // → "VISITANTE"
 */
export const normalizeTurmaToLetter = (turma: string | null | undefined): TurmaLetra | null => {
  if (!turma) return null;

  const upper = turma.toUpperCase().trim();

  // Caso especial: VISITANTE
  if (upper === 'VISITANTE') return 'VISITANTE';

  // Formato "TURMA X" ou "Turma X"
  const matchTurma = upper.match(/TURMA\s*([A-E])/);
  if (matchTurma) return matchTurma[1] as TurmaLetra;

  // Formato "LRX 2025" ou "LRX" (legado)
  const matchLR = upper.match(/LR([A-E])(?:\s*\d{4})?/);
  if (matchLR) return matchLR[1] as TurmaLetra;

  // Apenas letra única
  if (/^[A-E]$/.test(upper)) return upper as TurmaLetra;

  return null;
};

/**
 * Formata letra da turma para exibição na UI
 *
 * @param letra - Letra da turma ou string a ser normalizada
 * @returns String formatada para exibição (apenas letras, sem prefixo "Turma")
 *
 * @example
 * formatTurmaDisplay("A")          // → "A"
 * formatTurmaDisplay("VISITANTE")  // → "VISITANTE"
 * formatTurmaDisplay("TURMA B")    // → "B"
 * formatTurmaDisplay(null)         // → ""
 */
export const formatTurmaDisplay = (letra: TurmaLetra | string | null | undefined): string => {
  if (!letra) return '';

  // Se já está no formato correto
  if (letra === 'VISITANTE') return 'VISITANTE';

  // Normaliza primeiro (para aceitar qualquer formato)
  const normalized = normalizeTurmaToLetter(letra);

  if (!normalized) return String(letra); // Fallback para valor original

  return normalized; // Retorna apenas a letra (A, B, C, D, E ou VISITANTE)
};

/**
 * Compara duas turmas de forma tolerante a formatos diferentes
 *
 * @param turma1 - Primeira turma
 * @param turma2 - Segunda turma
 * @returns true se representam a mesma turma
 *
 * @example
 * compareTurmas("TURMA A", "A")          // → true
 * compareTurmas("LRA 2025", "Turma A")   // → true
 * compareTurmas("A", "B")                // → false
 */
export const compareTurmas = (turma1: string | null | undefined, turma2: string | null | undefined): boolean => {
  const letra1 = normalizeTurmaToLetter(turma1);
  const letra2 = normalizeTurmaToLetter(turma2);

  return letra1 === letra2 && letra1 !== null;
};

/**
 * Valida se uma turma é válida
 *
 * @param turma - String com turma
 * @returns true se a turma é válida
 */
export const isTurmaValida = (turma: string | null | undefined): boolean => {
  return normalizeTurmaToLetter(turma) !== null;
};

/**
 * Obtém lista de turmas formatadas para exibição em selects
 *
 * @returns Array de objetos com value (letra) e label (apenas letra)
 */
export const getTurmasParaSelect = (incluirVisitante = false) => {
  const turmas = incluirVisitante ? TODAS_TURMAS : TURMAS_VALIDAS;

  return turmas.map(letra => ({
    value: letra,
    label: letra // Apenas a letra (A, B, C, D, E ou VISITANTE)
  }));
};

/**
 * @deprecated Use normalizeTurmaToLetter
 * Mantido para compatibilidade retroativa
 */
export const extractTurmaLetter = (turma: string): string | null => {
  return normalizeTurmaToLetter(turma);
};

/**
 * @deprecated Use formatTurmaDisplay
 * Mantido para compatibilidade retroativa
 */
export const normalizeTurmaName = (turma: string): string => {
  return formatTurmaDisplay(turma);
};

/**
 * Converte turma para código do sistema (ex: "A" → "LRA2025")
 * @param turmaInput - Qualquer formato: "A", "Turma A", "TURMA A"
 * @param ano - Ano para o código (padrão: 2025)
 * @returns Código da turma ou "visitante"
 * @example
 * getTurmaCode("A")          // → "LRA2025"
 * getTurmaCode("Turma B")    // → "LRB2025"
 * getTurmaCode("visitante")  // → "visitante"
 */
export const getTurmaCode = (turmaInput: string, ano: number = 2025): string => {
  const letra = normalizeTurmaToLetter(turmaInput);
  if (!letra || letra === "VISITANTE") return "visitante";
  return `LR${letra}${ano}`;
};

/**
 * Retorna classes CSS do Tailwind para badge de turma
 * @param turmaInput - Qualquer formato de turma
 * @returns Classes CSS para usar em Badge ou div
 * @example
 * getTurmaColorClasses("A")          // → "bg-blue-100 text-blue-800"
 * getTurmaColorClasses("Turma B")    // → "bg-green-100 text-green-800"
 * getTurmaColorClasses("VISITANTE")  // → "bg-gray-100 text-gray-800"
 */
export const getTurmaColorClasses = (turmaInput: string): string => {
  const letra = normalizeTurmaToLetter(turmaInput);

  const colors: Record<string, string> = {
    "A": "bg-blue-100 text-blue-800",
    "B": "bg-green-100 text-green-800",
    "C": "bg-purple-100 text-purple-800",
    "D": "bg-orange-100 text-orange-800",
    "E": "bg-pink-100 text-pink-800",
    "VISITANTE": "bg-gray-100 text-gray-800"
  };

  return colors[letra || ""] || "bg-gray-100 text-gray-800";
};