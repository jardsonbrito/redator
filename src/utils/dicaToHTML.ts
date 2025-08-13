import DOMPurify from 'dompurify';

/**
 * Converte texto plano com quebras de linha em HTML com parágrafos
 * Sanitiza o conteúdo para prevenir XSS
 * 
 * @param raw - Texto bruto com quebras de linha
 * @returns HTML sanitizado com parágrafos formatados
 */
export function dicaToHTML(raw: string): string {
  if (!raw) return '';
  
  // Normaliza quebras de linha (Windows/Mac/Linux)
  const normalized = raw.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  
  // Quebra por parágrafos (duas quebras consecutivas ou mais)
  const blocks = normalized.split(/\n{2,}/).map(b => b.trim()).filter(Boolean);
  
  // Dentro de cada parágrafo, quebras simples viram <br>
  const html = blocks
    .map(block => `<p>${block.replace(/\n/g, '<br>')}</p>`)
    .join('');
  
  return DOMPurify.sanitize(html);
}