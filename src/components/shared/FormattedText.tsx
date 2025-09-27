import React from 'react';

interface FormattedTextProps {
  text: string;
  className?: string;
}

/**
 * Componente que formata texto automaticamente com:
 * - Recuo paragrafal (2em)
 * - Justificação de texto
 * - Alinhamento à direita para linhas que começam com "Fonte" ou "Disponível em"
 * - Fonte menor para referências
 */
export const FormattedText: React.FC<FormattedTextProps> = ({ text, className = '' }) => {
  if (!text) return null;

  // Normalizar quebras de linha
  const normalizedText = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  // Dividir em parágrafos (duas quebras consecutivas ou mais)
  const paragraphs = normalizedText
    .split(/\n\s*\n/)
    .map(p => p.trim())
    .filter(p => p.length > 0);

  // Se não há parágrafos múltiplos, dividir por quebras simples
  const finalParagraphs = paragraphs.length <= 1
    ? normalizedText.split('\n').map(line => line.trim()).filter(line => line.length > 0)
    : paragraphs;

  return (
    <div className={`formatted-text ${className}`}>
      <style>{`
        .formatted-text p {
          text-align: justify;
          text-indent: 2em;
          margin-bottom: 1em;
          line-height: 1.6;
        }
        .formatted-text .reference {
          text-align: right;
          text-indent: 0;
          font-size: 0.875em;
          color: #6b7280;
          margin-bottom: 1em;
          margin-top: 0.5em;
        }
        .formatted-text p:last-child {
          margin-bottom: 0;
        }
      `}</style>

      {finalParagraphs.map((paragraph, index) => {
        // Verificar se é uma linha de referência
        const isReference = /^(fonte|disponível em|source|available at)[\s:]/i.test(paragraph.trim());

        if (isReference) {
          return (
            <p key={index} className="reference">
              {paragraph}
            </p>
          );
        }

        // Parágrafo normal com recuo e justificação
        return (
          <p key={index}>
            {paragraph}
          </p>
        );
      })}
    </div>
  );
};