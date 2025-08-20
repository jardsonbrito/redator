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