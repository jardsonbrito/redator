/**
 * Normaliza texto removendo acentos e convertendo para minúsculas
 */
export const normalize = (text: string): string => {
  return text
    ?.normalize('NFD')
    ?.replace(/[\u0300-\u036f]/g, '')
    ?.toLowerCase() ?? '';
};

/**
 * Verifica se um texto contém outro texto (case e accent insensitive)
 */
export const textIncludes = (text: string, search: string): boolean => {
  return normalize(text).includes(normalize(search));
};

/**
 * Extrai eixos temáticos de uma string separada por vírgulas
 */
export const extractEixos = (eixoTematico: string): string[] => {
  if (!eixoTematico) return [];
  return eixoTematico
    .split(',')
    .map(eixo => eixo.trim())
    .filter(eixo => eixo.length > 0);
};

/**
 * Obtém lista única de eixos de uma lista de redações
 */
export const getUniqueEixos = (redacoes: Array<{ eixo_tematico?: string }>): string[] => {
  const eixosSet = new Set<string>();
  
  redacoes.forEach(redacao => {
    if (redacao.eixo_tematico) {
      extractEixos(redacao.eixo_tematico).forEach(eixo => {
        eixosSet.add(eixo);
      });
    }
  });
  
  return Array.from(eixosSet).sort();
};