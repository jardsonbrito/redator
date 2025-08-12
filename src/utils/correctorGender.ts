export type Gender = 'M' | 'F' | 'NB' | 'U' | null | undefined;

/**
 * Retorna "Corretor", "Corretora" ou "Corretor(a)" baseado no gênero
 */
export function correctorNoun(gender: Gender): string {
  if (gender === 'F') return 'Corretora';
  if (gender === 'M') return 'Corretor';
  return 'Corretor(a)'; // NB, U, null
}

/**
 * Retorna artigo "ao" ou "à" 
 */
export function correctorArticleAo(gender: Gender): string {
  return gender === 'F' ? 'à' : 'ao';
}

/**
 * Retorna artigo "do" ou "da"
 */
export function correctorArticleDo(gender: Gender): string {
  return gender === 'F' ? 'da' : 'do';
}

/**
 * Retorna artigo "no" ou "na"
 */
export function correctorArticleNo(gender: Gender): string {
  return gender === 'F' ? 'na' : 'no';
}

/**
 * Retorna preposição "para o" ou "para a"
 */
export function correctorArticlePara(gender: Gender): string {
  return gender === 'F' ? 'para a' : 'para o';
}

/**
 * Retorna preposição "com o" ou "com a"
 */
export function correctorArticleCom(gender: Gender): string {
  return gender === 'F' ? 'com a' : 'com o';
}

/**
 * Retorna preposição "pelo" ou "pela"
 */
export function correctorArticlePelo(gender: Gender): string {
  return gender === 'F' ? 'pela' : 'pelo';
}

/**
 * Retorna artigo definido "o" ou "a"
 */
export function correctorArticle(gender: Gender): string {
  return gender === 'F' ? 'a' : 'o';
}