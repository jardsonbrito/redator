import React from 'react';

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

/**
 * Função utilitária para renderizar texto com parágrafos preservados
 * Suporta quebras de linha duplas (parágrafos) e simples (linhas)
 */
export const renderTextWithParagraphs = (text: string): React.ReactNode => {
  if (!text) return null;
  
  // Dividir por quebras de linha duplas (parágrafos)
  const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim());
  
  if (paragraphs.length <= 1) {
    // Se só há um parágrafo, dividir por quebras simples
    const lines = text.split('\n').filter(line => line.trim());
    if (lines.length <= 1) {
      return React.createElement('span', null, text);
    }
    return React.createElement('div', { className: 'space-y-2' },
      lines.map((line, index) => 
        React.createElement('p', { key: index }, line.trim())
      )
    );
  }
  
  return React.createElement('div', { className: 'space-y-4' },
    paragraphs.map((paragraph, index) => 
      React.createElement('p', { key: index, className: 'leading-relaxed' }, paragraph.trim())
    )
  );
};

/**
 * Função simplificada para preservar apenas quebras de linha simples
 */
export const renderTextWithLineBreaks = (text: string): React.ReactNode => {
  if (!text) return null;
  
  const lines = text.split('\n').filter(line => line.trim());
  
  if (lines.length <= 1) {
    return React.createElement('span', null, text);
  }
  
  return React.createElement('div', null,
    lines.map((line, index) => 
      React.createElement('p', { key: index, className: 'mb-2 last:mb-0' }, line.trim())
    )
  );
};