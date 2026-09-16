/**
 * Corrige automaticamente a orientação de imagens de redação manuscrita.
 *
 * ## Problema raiz
 *
 * Browsers modernos aplicam o metadado EXIF ao exibir imagens via `<img>`,
 * fazendo a foto parecer na orientação correta na tela. Porém:
 *
 *  - Os **pixels brutos no arquivo JPEG** podem estar em landscape (câmera
 *    horizontal) enquanto o EXIF diz ao browser para rotacionar.
 *  - Visualizadores que **ignoram EXIF** (jsPDF, algumas ferramentas de
 *    correção, serviços de terceiros) exibem a imagem na orientação bruta,
 *    resultando em uma redação deitada para o corretor.
 *
 * ## Solução
 *
 * Sempre desenhar a imagem em um `<canvas>` antes de salvar.
 * O `ctx.drawImage` aplica o EXIF automaticamente (padrão desde Chrome 81,
 * Firefox 64 e Safari moderno), produzindo pixels já na orientação visual
 * correta. O JPEG resultante não depende de metadados EXIF para ser exibido
 * corretamente em nenhum visualizador.
 *
 * Além disso, se após a normalização do EXIF a imagem ainda estiver em
 * landscape (largura > altura), ela é rotacionada 90° CW para portrait.
 */

/**
 * Normaliza a orientação de uma imagem de redação manuscrita para que os
 * **pixels armazenados** estejam sempre em portrait, independente de qualquer
 * metadado EXIF e de qualquer visualizador (browser, jsPDF, etc.).
 *
 * @param file  Arquivo de imagem (JPG ou PNG). PDFs são devolvidos sem alteração.
 * @returns     Promise com arquivo JPEG corrigido (qualidade 92%).
 *              Em caso de erro de canvas, devolve o arquivo original.
 */
export async function corrigirOrientacaoImagem(file: File): Promise<File> {
  // PDFs e tipos não-imagem não são processados
  if (!file.type.startsWith('image/')) return file;

  return new Promise((resolve) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);

      // naturalWidth/naturalHeight = dimensões visuais APÓS o browser aplicar EXIF.
      // Exemplos:
      //   Foto portrait do iPhone (pixels brutos landscape, EXIF 6):
      //     naturalWidth = 3024, naturalHeight = 4032  →  portrait ✓
      //   Foto landscape genuína (pixels brutos landscape, EXIF 1):
      //     naturalWidth = 4032, naturalHeight = 3024  →  landscape, precisa girar
      const w = img.naturalWidth;
      const h = img.naturalHeight;

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        // Canvas indisponível: fallback ao arquivo original
        resolve(file);
        return;
      }

      if (w > h) {
        // ----------------------------------------------------------------
        // Landscape → rotacionar 90° CW para portrait.
        // ----------------------------------------------------------------
        canvas.width  = h; // nova largura em portrait
        canvas.height = w; // nova altura  em portrait

        // Transformação 90° CW: ponto fonte (x, y) → canvas (h − y, x)
        //   setTransform(a, b, c, d, e, f):
        //     canvas_x = a·x + c·y + e = 0·x + (−1)·y + h = h − y
        //     canvas_y = b·x + d·y + f = 1·x +  0·y  + 0 = x
        ctx.setTransform(0, 1, -1, 0, h, 0);
      } else {
        // ----------------------------------------------------------------
        // Portrait ou quadrado.
        // NÃO devolvemos o arquivo original mesmo aqui, porque os pixels
        // brutos podem estar em landscape com EXIF de correção. Ao desenhar
        // via ctx.drawImage, o browser já aplica o EXIF, e o JPEG resultante
        // terá os pixels na orientação visual correta sem depender de EXIF.
        // ----------------------------------------------------------------
        canvas.width  = w;
        canvas.height = h;
        // sem transformação adicional — ctx.drawImage aplica o EXIF
      }

      // ctx.drawImage respeita image-orientation: from-image (padrão em browsers
      // modernos), ou seja, aplica o EXIF antes de copiar os pixels para o canvas.
      ctx.drawImage(img, 0, 0);

      canvas.toBlob(
        (blob) => {
          if (blob) {
            // JPEG com pixels corretamente orientados e sem EXIF de rotação
            resolve(new File([blob], file.name, { type: 'image/jpeg' }));
          } else {
            resolve(file); // fallback
          }
        },
        'image/jpeg',
        0.92,
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(file);
    };

    img.src = objectUrl;
  });
}
