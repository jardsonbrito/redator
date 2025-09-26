/**
 * Converte texto plano com quebras de linha em HTML com parágrafos
 * Sanitiza o conteúdo para prevenir XSS com fallback robusto
 *
 * @param raw - Texto bruto com quebras de linha
 * @returns HTML sanitizado com parágrafos formatados
 */
export function dicaToHTML(raw: string): string {
  try {
    if (!raw || typeof raw !== 'string') return '';

    // Normaliza quebras de linha (Windows/Mac/Linux)
    const normalized = raw.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

    // Quebra por parágrafos (duas quebras consecutivas ou mais)
    const blocks = normalized.split(/\n{2,}/).map(b => b.trim()).filter(Boolean);

    // Dentro de cada parágrafo, quebras simples viram <br>
    const html = blocks
      .map(block => `<p>${escapeHtml(block).replace(/\n/g, '<br>')}</p>`)
      .join('');

    // Tentar usar DOMPurify se disponível
    try {
      const DOMPurify = require('dompurify');
      return DOMPurify.sanitize(html);
    } catch {
      // Fallback: retornar HTML com escape manual se DOMPurify falhar
      console.warn('DOMPurify não disponível, usando sanitização básica');
      return html;
    }
  } catch (error) {
    console.error('Erro na função dicaToHTML:', error);
    // Em caso de erro, retornar texto simples escapado
    return escapeHtml(raw || '');
  }
}

/**
 * Escape básico de HTML para prevenir XSS
 */
function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}