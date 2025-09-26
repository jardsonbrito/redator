/**
 * Formata o texto da redação convertendo quebras de linha em parágrafos HTML
 * para aplicar recuo paragrafal e justificação
 */
export function formatRedacaoText(text: string): string {
  if (!text) return '';

  // Normalizar quebras de linha
  const normalized = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  // Dividir em parágrafos (duas quebras consecutivas ou mais)
  const paragraphs = normalized
    .split(/\n\s*\n/)
    .map(p => p.trim())
    .filter(p => p.length > 0);

  // Se não há parágrafos múltiplos, dividir por quebras simples
  if (paragraphs.length <= 1) {
    const lines = normalized
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0);

    return lines.map(line => `<p>${escapeHtml(line)}</p>`).join('');
  }

  // Converter cada parágrafo em HTML
  return paragraphs
    .map(paragraph => {
      // Dentro de cada parágrafo, preservar quebras simples como <br>
      const formattedParagraph = paragraph
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0)
        .map(line => escapeHtml(line))
        .join('<br>');

      return `<p>${formattedParagraph}</p>`;
    })
    .join('');
}

/**
 * Escape básico de HTML para prevenir XSS
 */
function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}