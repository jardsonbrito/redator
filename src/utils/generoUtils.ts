// Nomes masculinos que terminam em 'a' (exceções à regra)
const MASCULINOS_EM_A = new Set([
  'luca', 'lucas', 'nikita', 'ezra', 'joshua', 'elisha', 'borja', 'mattia',
]);

// Nomes femininos que NÃO terminam em 'a' — comum no Brasil
const FEMININOS_CONHECIDOS = new Set([
  // terminados em vogal ou semivogal diferente de 'a'
  'alice', 'aline', 'anice', 'arlete', 'aurelie', 'berenice', 'cecile',
  'cleonice', 'denise', 'dulce', 'edite', 'eliane', 'elice', 'elizete',
  'elodie', 'eloise', 'eunice', 'gisele', 'giselle', 'heloice', 'heloíse',
  'heloise', 'irene', 'iracele', 'joice', 'joyce', 'jussiele', 'leide',
  'luise', 'monique', 'neide', 'noemi', 'odete', 'solange', 'veronique',
  'yasmim', 'yasmin', 'zoé', 'zoe',
  // terminados em consoante
  'abigail', 'adair', 'aldair', 'beatriz', 'berenil', 'crystal', 'cristal',
  'dailor', 'deborah', 'debora', 'edith', 'esther', 'ester', 'flor',
  'hortensil', 'inair', 'ines', 'iris', 'ivanir', 'izabel', 'isabel',
  'jael', 'janair', 'lais', 'leonor', 'liz', 'luz', 'mar', 'nair',
  'naomi', 'nilcir', 'noemi', 'pilar', 'rachel', 'raquel', 'raqueli',
  'rosenir', 'ruth', 'sueli', 'suely', 'tais', 'taís', 'vanir', 'vilmar',
  'walquiria', 'yael',
]);

function removerAcentos(str: string): string {
  return str.normalize('NFD').replace(/[̀-ͯ]/g, '');
}

export function detectarGeneroNome(nomeCompleto: string): 'feminino' | 'masculino' {
  if (!nomeCompleto?.trim()) return 'masculino';

  const primeiro = removerAcentos(nomeCompleto.trim().split(/\s+/)[0].toLowerCase());

  if (MASCULINOS_EM_A.has(primeiro)) return 'masculino';
  if (FEMININOS_CONHECIDOS.has(primeiro)) return 'feminino';

  // Terminações tipicamente femininas em português
  if (
    primeiro.endsWith('a') ||
    primeiro.endsWith('ane') ||
    primeiro.endsWith('iane') ||
    primeiro.endsWith('ine') ||
    primeiro.endsWith('elle') ||
    primeiro.endsWith('ette') ||
    primeiro.endsWith('eide') ||
    primeiro.endsWith('aide') ||
    primeiro.endsWith('nice')
  ) return 'feminino';

  return 'masculino';
}

export function tituloCorretor(genero: 'feminino' | 'masculino'): string {
  return genero === 'feminino' ? 'Corretora' : 'Corretor';
}

export function artigoCorretor(genero: 'feminino' | 'masculino'): string {
  return genero === 'feminino' ? 'a' : 'o';
}
