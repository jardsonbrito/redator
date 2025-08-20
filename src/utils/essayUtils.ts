import { RedacaoCorretor } from '@/hooks/useCorretorRedacoes';

export function getTableOriginFromRedacao(redacao: RedacaoCorretor): 'redacoes_enviadas' | 'redacoes_simulado' | 'redacoes_exercicio' {
  switch (redacao.tipo_redacao) {
    case 'regular':
      return 'redacoes_enviadas';
    case 'simulado':
      return 'redacoes_simulado';  
    case 'exercicio':
      return 'redacoes_exercicio';
    default:
      // Default to regular essays
      return 'redacoes_enviadas';
  }
}

export function isManuscritaRedacao(redacao: RedacaoCorretor): boolean {
  return !!(redacao.redacao_manuscrita_url);
}

export function needsImageRender(redacao: RedacaoCorretor): boolean {
  // If it's manuscrita, no need to render (already has image)
  if (isManuscritaRedacao(redacao)) {
    return false;
  }
  
  // If it's digitada and doesn't have render_image_url, needs rendering
  return true;
}

export function getImageUrlForVisualization(redacao: RedacaoCorretor & {
  render_image_url?: string;
  render_status?: string;
}): string | null {
  // If manuscrita, use the original URL
  if (isManuscritaRedacao(redacao)) {
    return redacao.redacao_manuscrita_url;
  }
  
  // If digitada with ready render, use rendered image
  if (redacao.render_status === 'ready' && redacao.render_image_url) {
    return redacao.render_image_url;
  }
  
  return null;
}

// ======= NEW UNIFIED INTERFACE =======

interface RedacaoData {
  redacao_manuscrita_url?: string;
  redacao_texto?: string;
  texto?: string; // For simulados
  render_image_url?: string;
  render_status?: string;
}

/**
 * Determines the display URL for an essay (either handwritten image or rendered typed text)
 * @param redacao - The essay data
 * @returns The URL to display for correction, or null if not available
 */
export function getEssayDisplayUrl(redacao: RedacaoData): string | null {
  // Priority 1: Handwritten essay (manuscrita)
  if (redacao.redacao_manuscrita_url) {
    return redacao.redacao_manuscrita_url;
  }

  // Priority 2: If digitada with ready render, use rendered image
  if (redacao.render_status === 'ready' && redacao.render_image_url) {
    return redacao.render_image_url;
  }

  // Priority 3: If digitada but render not ready, return null (will show loading/render state)
  const hasTypedText = redacao.redacao_texto || redacao.texto;
  if (hasTypedText && !redacao.redacao_manuscrita_url) {
    return null; // This indicates a typed essay that needs rendering
  }

  return null;
}

/**
 * Checks if an essay is typed (digitada) vs handwritten (manuscrita)
 */
export function isTypedEssay(redacao: RedacaoData): boolean {
  return !redacao.redacao_manuscrita_url && !!(redacao.redacao_texto || redacao.texto);
}

/**
 * Gets the raw text content from an essay
 */
export function getEssayText(redacao: RedacaoData): string {
  // Try redacao_texto first (for regular essays), then texto (for simulados)
  const text = redacao.redacao_texto || redacao.texto || '';
  console.log('📝 getEssayText:', { 
    redacao_texto: redacao.redacao_texto?.length || 0,
    texto: redacao.texto?.length || 0,
    result: text.length,
    preview: text.substring(0, 100) + '...'
  });
  return text;
}

/**
 * Determines if an essay needs rendering
 */
export function needsRendering(redacao: RedacaoData): boolean {
  return isTypedEssay(redacao) && redacao.render_status !== 'ready';
}

/**
 * Triggers automatic rendering for a typed essay
 */
export async function triggerEssayRender(essayId: string, tableOrigin: string, essayData: RedacaoData): Promise<void> {
  // This will be called automatically by the background processor
  // But we can also manually trigger it if needed
  console.log(`📝 Essay ${essayId} flagged for rendering`);
}