/**
 * Remove acentos e caracteres especiais de nomes de arquivo para upload no Storage.
 */
export const sanitizeFileName = (name: string): string => {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._-]/g, '_');
};
