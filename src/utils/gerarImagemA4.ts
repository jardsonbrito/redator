/**
 * Utilitário para converter texto de redação em imagem A4 padronizada
 * Formato: A4, margens 2.5cm, fonte 11pt, espaçamento 1.15
 */

interface ConfiguracaoA4 {
  largura: number;      // pixels
  altura: number;       // pixels
  margemCm: number;     // em cm
  tamanhoFonte: number; // em pixels
  lineHeight: number;   // multiplicador
  dpi: number;
}

const CONFIG_PADRAO: ConfiguracaoA4 = {
  largura: 2480,        // A4 width em 300dpi (21cm)
  altura: 3508,         // A4 height em 300dpi (29.7cm)
  margemCm: 2.5,        // 2.5cm de margem
  tamanhoFonte: 50,     // ~13pt em 300dpi (13pt * 300/72) - +2pt
  lineHeight: 1.7,      // Espaçamento 1.7 (entrelinhas ainda maior)
  dpi: 300
};

/**
 * Converte cm para pixels baseado no DPI
 */
function cmParaPixels(cm: number, dpi: number): number {
  return Math.round((cm * dpi) / 2.54);
}

/**
 * Estrutura para armazenar informações de cada linha
 */
interface LinhaInfo {
  texto: string;
  ehInicioParagrafo: boolean;
}

/**
 * Quebra texto em linhas respeitando largura máxima E parágrafos
 */
function quebrarTextoEmLinhas(
  ctx: CanvasRenderingContext2D,
  texto: string,
  larguraMaxima: number
): LinhaInfo[] {
  const linhas: LinhaInfo[] = [];

  // Dividir por quebras de linha (parágrafos)
  const paragrafos = texto.split(/\n+/);

  paragrafos.forEach((paragrafo, indexParagrafo) => {
    // Pular parágrafos vazios
    if (!paragrafo.trim()) {
      // Adicionar linha vazia entre parágrafos
      if (indexParagrafo > 0 && indexParagrafo < paragrafos.length - 1) {
        linhas.push({
          texto: '',
          ehInicioParagrafo: false
        });
      }
      return;
    }

    // Quebrar parágrafo em palavras
    const palavras = paragrafo.trim().split(' ');
    let linhaAtual = '';

    palavras.forEach(palavra => {
      const testeLinhaAtual = linhaAtual ? `${linhaAtual} ${palavra}` : palavra;
      const medida = ctx.measureText(testeLinhaAtual);

      if (medida.width > larguraMaxima && linhaAtual) {
        // Adicionar linha completa
        linhas.push({
          texto: linhaAtual,
          ehInicioParagrafo: linhas.length === 0 || linhas[linhas.length - 1].texto === ''
        });
        linhaAtual = palavra;
      } else {
        linhaAtual = testeLinhaAtual;
      }
    });

    // Adicionar última linha do parágrafo
    if (linhaAtual) {
      linhas.push({
        texto: linhaAtual,
        ehInicioParagrafo: linhas.length === 0 || linhas[linhas.length - 1].texto === ''
      });
    }

    // Adicionar linha vazia entre parágrafos (exceto no último)
    if (indexParagrafo < paragrafos.length - 1) {
      linhas.push({
        texto: '',
        ehInicioParagrafo: false
      });
    }
  });

  return linhas;
}

/**
 * Gera imagem A4 do texto da redação
 * @param texto - Texto da redação (limitado a 500 palavras)
 * @returns Promise com Blob da imagem JPEG
 */
export async function gerarImagemA4DeTexto(
  texto: string
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    try {
      const config = CONFIG_PADRAO;
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        throw new Error('Não foi possível criar contexto do canvas');
      }

      // Configurar dimensões A4
      canvas.width = config.largura;
      canvas.height = config.altura;

      // Fundo branco
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Configurar fonte e cor do texto
      ctx.fillStyle = '#000000';
      ctx.font = `${config.tamanhoFonte}px "Times New Roman", Times, serif`;
      ctx.textBaseline = 'top';

      // Calcular margens em pixels
      const margemPx = cmParaPixels(config.margemCm, config.dpi);
      const larguraTexto = canvas.width - (margemPx * 2);
      const alturaTexto = canvas.height - (margemPx * 2);

      let yAtual = margemPx;
      const espacamentoLinha = config.tamanhoFonte * config.lineHeight;

      // Renderizar texto principal com indentação nos parágrafos (alinhado à esquerda)
      const linhasTexto = quebrarTextoEmLinhas(ctx, texto, larguraTexto);
      const recuoParagrafo = cmParaPixels(1.25, config.dpi); // Recuo de 1.25cm

      linhasTexto.forEach((linha, index) => {
        // Verificar se ainda cabe na página
        if (yAtual + espacamentoLinha > margemPx + alturaTexto) {
          console.warn(`Texto excedeu altura da página A4 na linha ${index + 1}`);
          return; // Para de renderizar se não couber
        }

        // Linha vazia = separador entre parágrafos
        if (linha.texto === '') {
          yAtual += espacamentoLinha * 0.5; // Espaço reduzido entre parágrafos
          return;
        }

        // Aplicar recuo na primeira linha de cada parágrafo
        const xPosicao = linha.ehInicioParagrafo ? margemPx + recuoParagrafo : margemPx;

        // Renderizar linha alinhada à esquerda
        ctx.fillText(linha.texto, xPosicao, yAtual);
        yAtual += espacamentoLinha;
      });

      // Converter canvas para Blob JPEG
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Falha ao gerar imagem'));
          }
        },
        'image/jpeg',
        0.92 // Qualidade 92%
      );

    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Valida se o arquivo gerado está dentro dos limites aceitáveis
 */
export function validarImagemGerada(blob: Blob): { valido: boolean; erro?: string } {
  const tamanhoMaxMB = 5;
  const tamanhoMB = blob.size / (1024 * 1024);

  if (tamanhoMB > tamanhoMaxMB) {
    return {
      valido: false,
      erro: `Imagem muito grande: ${tamanhoMB.toFixed(2)}MB (máx. ${tamanhoMaxMB}MB)`
    };
  }

  if (blob.type !== 'image/jpeg') {
    return {
      valido: false,
      erro: `Tipo incorreto: ${blob.type} (esperado: image/jpeg)`
    };
  }

  return { valido: true };
}

/**
 * Utilitário helper para gerar nome de arquivo único
 */
export function gerarNomeArquivoA4(prefixo: string = 'redacao'): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return `${prefixo}_a4_${timestamp}_${random}.jpg`;
}

/**
 * Conta o número de palavras em um texto
 */
export function contarPalavras(texto: string): number {
  const textoLimpo = texto.trim();
  if (!textoLimpo) return 0;
  return textoLimpo.split(/\s+/).length;
}
