/**
 * Corrige automaticamente a orientação de imagens de redação manuscrita,
 * garantindo que o corretor sempre visualize a redação em modo retrato (portrait).
 *
 * ## Por que não fazemos parsing manual de EXIF?
 *
 * Browsers modernos (Chrome 81+, Firefox, Safari) já aplicam automaticamente
 * os metadados EXIF ao carregar uma imagem:
 *   - `img.naturalWidth / naturalHeight` retornam as dimensões VISUAIS (pós-EXIF)
 *   - `ctx.drawImage(img, ...)` desenha o conteúdo já com o EXIF aplicado
 *
 * Fazer parsing manual e aplicar transformações de canvas resultaria em dupla
 * rotação para as câmeras mais comuns (orientation 6 e 8).
 *
 * ## Abordagem
 *
 * Confiar no browser para aplicar o EXIF e apenas verificar se as dimensões
 * visuais resultantes ainda estão em landscape (largura > altura). Se sim,
 * rotacionar 90° no sentido horário e exportar como JPEG limpo (sem EXIF de
 * orientação), garantindo exibição correta em qualquer visualizador.
 */

/**
 * Corrige a orientação de uma imagem de redação manuscrita para portrait.
 *
 * @param file  Arquivo de imagem (JPG ou PNG). PDFs são devolvidos sem alteração.
 * @returns     Promise com arquivo JPEG corrigido (qualidade 92%) ou o arquivo
 *              original quando nenhuma correção é necessária.
 */
export async function corrigirOrientacaoImagem(file: File): Promise<File> {
  // PDFs e tipos não-imagem não são processados
  if (!file.type.startsWith('image/')) return file;

  return new Promise((resolve) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);

      // naturalWidth/naturalHeight refletem as dimensões VISUAIS após o browser
      // aplicar o EXIF — são os valores corretos para decidir a orientação real.
      const w = img.naturalWidth;
      const h = img.naturalHeight;

      // Já está em portrait ou quadrado: nenhuma correção necessária.
      // Retornamos o arquivo original sem recompressão.
      if (w <= h) {
        resolve(file);
        return;
      }

      // -----------------------------------------------------------------------
      // Imagem está em landscape (largura > altura) — rotacionar 90° CW.
      // O canvas resultante terá portrait: width=h, height=w.
      // -----------------------------------------------------------------------
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        // Canvas não disponível: fallback ao arquivo original
        resolve(file);
        return;
      }

      // Após rotação 90° CW as dimensões se invertem
      canvas.width  = h; // nova largura (portrait)
      canvas.height = w; // nova altura  (portrait)

      // Matriz de transformação para rotação 90° CW:
      //   ponto fonte (x, y) → canvas (h − y,  x)
      //
      //   setTransform(a, b, c, d, e, f):
      //     canvas_x = a·x + c·y + e  →  0·x + (−1)·y + h  =  h − y
      //     canvas_y = b·x + d·y + f  →  1·x +  0·y  + 0  =  x
      ctx.setTransform(0, 1, -1, 0, h, 0);

      // O browser já aplicou o EXIF ao desenhar — o canvas recebe o conteúdo
      // visualmente correto rotacionado para portrait.
      ctx.drawImage(img, 0, 0);

      canvas.toBlob(
        (blob) => {
          if (blob) {
            // Novo arquivo JPEG com pixels em portrait e sem EXIF de orientação
            resolve(new File([blob], file.name, { type: 'image/jpeg' }));
          } else {
            resolve(file); // fallback: arquivo original
          }
        },
        'image/jpeg',
        0.92,
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(file); // fallback: arquivo original
    };

    img.src = objectUrl;
  });
}
