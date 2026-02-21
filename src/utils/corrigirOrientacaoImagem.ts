/**
 * Utilitário para corrigir automaticamente a orientação de imagens de redação manuscrita.
 *
 * Problemas resolvidos:
 * 1. Imagens com metadados EXIF indicando rotação (fotos de câmera que precisam
 *    ser rotacionadas para exibição correta — o dado EXIF é aplicado, normalizando
 *    os pixels no canvas independente de suporte do browser).
 * 2. Imagens genuinamente em landscape (largura > altura) que precisam ser
 *    rotacionadas 90° para ficarem em modo retrato (portrait), exigência do
 *    sistema de correção de redações manuscritas.
 */

/**
 * Lê o valor de orientação EXIF de um arquivo JPEG.
 * @returns Valor 1–8 conforme padrão EXIF, ou 1 (normal) se não encontrado.
 */
async function lerOrientacaoExif(file: File): Promise<number> {
  // PNG e outros formatos raramente têm EXIF de orientação; retornar padrão.
  if (file.type !== 'image/jpeg' && file.type !== 'image/jpg') {
    return 1;
  }

  return new Promise((resolve) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const buffer = e.target?.result as ArrayBuffer;
        if (!buffer || buffer.byteLength < 12) { resolve(1); return; }

        const view = new DataView(buffer);

        // Verificar assinatura JPEG: FFD8
        if (view.getUint16(0) !== 0xFFD8) { resolve(1); return; }

        let offset = 2;

        while (offset + 4 <= view.byteLength) {
          if (view.getUint8(offset) !== 0xFF) break;

          const marker = view.getUint8(offset + 1);

          // Marcadores sem campo de comprimento (SOI, EOI, RST0–RST7)
          if (marker === 0xD8 || marker === 0xD9 ||
              (marker >= 0xD0 && marker <= 0xD7)) {
            offset += 2;
            continue;
          }

          if (offset + 4 > view.byteLength) break;
          const segmentLength = view.getUint16(offset + 2);

          // APP1 (0xE1) — segmento que pode conter dados EXIF
          if (marker === 0xE1) {
            const exifStart = offset + 4;

            // Verificar assinatura "Exif\0\0"
            if (exifStart + 6 > view.byteLength) { resolve(1); return; }

            const sig = String.fromCharCode(
              view.getUint8(exifStart),
              view.getUint8(exifStart + 1),
              view.getUint8(exifStart + 2),
              view.getUint8(exifStart + 3),
            );

            if (sig !== 'Exif') { resolve(1); return; }

            // Bloco TIFF começa 6 bytes após "Exif\0\0"
            const tiff = exifStart + 6;
            if (tiff + 8 > view.byteLength) { resolve(1); return; }

            // Detectar endianness: 0x4949 = Intel (little-endian), 0x4D4D = Motorola
            const byteOrder = view.getUint16(tiff);
            const le = byteOrder === 0x4949;
            if (byteOrder !== 0x4949 && byteOrder !== 0x4D4D) { resolve(1); return; }

            // Verificar magic number TIFF = 42
            if (view.getUint16(tiff + 2, le) !== 42) { resolve(1); return; }

            // Offset do IFD0 a partir do início do bloco TIFF
            const ifd0Offset = view.getUint32(tiff + 4, le);
            const ifd0 = tiff + ifd0Offset;
            if (ifd0 + 2 > view.byteLength) { resolve(1); return; }

            const entryCount = view.getUint16(ifd0, le);

            // Procurar tag de orientação: 0x0112 (274)
            for (let i = 0; i < entryCount; i++) {
              const entry = ifd0 + 2 + i * 12;
              if (entry + 12 > view.byteLength) break;

              const tag = view.getUint16(entry, le);
              if (tag === 0x0112) {
                const val = view.getUint16(entry + 8, le);
                resolve(val >= 1 && val <= 8 ? val : 1);
                return;
              }
            }

            resolve(1);
            return;
          }

          // Pular para o próximo segmento JPEG
          offset += 2 + segmentLength;
        }

        resolve(1);
      } catch {
        resolve(1);
      }
    };

    reader.onerror = () => resolve(1);

    // EXIF está sempre nos primeiros bytes do arquivo; 128 KB é mais que suficiente
    reader.readAsArrayBuffer(file.slice(0, 131072));
  });
}

/**
 * Aplica a transformação de orientação EXIF em um canvas.
 *
 * Usa setTransform com a matriz de transformação correta para cada valor de
 * orientação EXIF (1–8), garantindo que os pixels do canvas fiquem sempre na
 * posição visual correta, independente de metadados.
 *
 * Referência de transformações (a, b, c, d, e, f):
 *   canvas x' = a*x + c*y + e
 *   canvas y' = b*x + d*y + f
 */
function aplicarOrientacaoNoCanvas(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  img: HTMLImageElement,
  orientation: number,
): void {
  const w = img.naturalWidth;
  const h = img.naturalHeight;

  // Orientações 5–8 requerem troca de largura/altura no canvas
  const swap = orientation >= 5;
  canvas.width  = swap ? h : w;
  canvas.height = swap ? w : h;

  switch (orientation) {
    case 2: // Flip horizontal
      ctx.setTransform(-1, 0, 0, 1, w, 0);
      break;
    case 3: // Rotação 180°
      ctx.setTransform(-1, 0, 0, -1, w, h);
      break;
    case 4: // Flip vertical
      ctx.setTransform(1, 0, 0, -1, 0, h);
      break;
    case 5: // Transposição (flip horizontal + 90° CCW)
      ctx.setTransform(0, 1, 1, 0, 0, 0);
      break;
    case 6: // Rotação 90° CW — caso mais comum em fotos de celular
      ctx.setTransform(0, 1, -1, 0, h, 0);
      break;
    case 7: // Transversão (flip horizontal + 90° CW)
      ctx.setTransform(0, -1, -1, 0, h, w);
      break;
    case 8: // Rotação 90° CCW
      ctx.setTransform(0, -1, 1, 0, 0, w);
      break;
    default: // case 1: normal — sem transformação
      break;
  }

  ctx.drawImage(img, 0, 0);
}

/**
 * Corrige a orientação de uma imagem de redação manuscrita para que ela
 * sempre fique no modo retrato (portrait / vertical).
 *
 * O processamento ocorre em duas etapas:
 *  1. Aplicar a rotação indicada pelos metadados EXIF (normaliza a imagem
 *     independente do suporte do browser).
 *  2. Se a imagem resultante ainda estiver em landscape (largura > altura),
 *     rotacionar 90° no sentido horário para ficar em portrait.
 *
 * @param file  Arquivo de imagem (JPG, PNG). PDFs são retornados sem alteração.
 * @returns     Promise com novo File corrigido (JPEG 92%), ou o arquivo original
 *              em caso de erro ou quando nenhuma correção é necessária.
 */
export async function corrigirOrientacaoImagem(file: File): Promise<File> {
  // PDFs e tipos não-imagem não são processados
  if (!file.type.startsWith('image/')) return file;

  return new Promise((resolve) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();

    const cleanup = () => URL.revokeObjectURL(objectUrl);

    img.onload = async () => {
      try {
        const w = img.naturalWidth;
        const h = img.naturalHeight;

        // Ler orientação EXIF (somente para JPEG; PNG retorna 1)
        const orientation = await lerOrientacaoExif(file);

        // Calcular dimensões efetivas após correção EXIF
        // Orientações 5–8 invertem largura/altura
        const swap = orientation >= 5;
        const effectiveW = swap ? h : w;
        const effectiveH = swap ? w : h;

        const needsExifFix = orientation !== 1;
        const needsRotation = effectiveW > effectiveH; // ainda landscape?

        // Nenhuma correção necessária: retornar arquivo original sem recompressão
        if (!needsExifFix && !needsRotation) {
          cleanup();
          resolve(file);
          return;
        }

        // --- Etapa 1: Aplicar correção EXIF no canvas ---
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        if (!ctx) { cleanup(); resolve(file); return; }

        aplicarOrientacaoNoCanvas(ctx, canvas, img, orientation);
        cleanup();

        // --- Etapa 2: Rotacionar 90° CW se ainda estiver em landscape ---
        if (canvas.width > canvas.height) {
          const rotCanvas = document.createElement('canvas');
          const rotCtx = rotCanvas.getContext('2d');

          if (!rotCtx) { resolve(file); return; }

          // Portrait: largura e altura se invertem
          rotCanvas.width  = canvas.height;
          rotCanvas.height = canvas.width;

          // Transformação 90° CW: (x,y) → (canvasHeight - y, x)
          rotCtx.setTransform(0, 1, -1, 0, canvas.height, 0);
          rotCtx.drawImage(canvas, 0, 0);

          rotCanvas.toBlob((blob) => {
            if (blob) resolve(new File([blob], file.name, { type: 'image/jpeg' }));
            else resolve(file);
          }, 'image/jpeg', 0.92);

          return;
        }

        // Imagem já está em portrait após correção EXIF — exportar canvas
        canvas.toBlob((blob) => {
          if (blob) resolve(new File([blob], file.name, { type: 'image/jpeg' }));
          else resolve(file);
        }, 'image/jpeg', 0.92);

      } catch {
        cleanup();
        resolve(file);
      }
    };

    img.onerror = () => { cleanup(); resolve(file); };
    img.src = objectUrl;
  });
}
