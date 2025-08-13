import { supabase } from "@/integrations/supabase/client";

const PLACEHOLDER_URL = '/src/assets/tema-cover-placeholder.png';

// Helper to get public URL from Supabase storage
function storageURL(path?: string | null): string | null {
  if (!path) return null;
  const { data } = supabase.storage.from("themes").getPublicUrl(path);
  return data.publicUrl;
}

// Unified cover resolver: filePath (from Supabase Storage) → public URL; else raw URL; else placeholder
export function resolveCover(filePath?: string | null, url?: string | null): string {
  const storageUrl = storageURL(filePath);
  if (storageUrl) return storageUrl;
  if (url) return url;
  return PLACEHOLDER_URL;
}

// Aulas: 1) thumbnail do vídeo 2) capa manual 3) placeholder
export function resolveAulaCover(aula: any): string {
  if (aula?.video_thumbnail_url) return aula.video_thumbnail_url;
  return resolveCover(aula?.cover_file_path, aula?.cover_url);
}

// Simulados: capa do Tema
export function resolveSimuladoCover(simulado: any): string {
  const tema = simulado?.tema;
  return resolveCover(tema?.cover_file_path, tema?.cover_url);
}

// Exemplares: usar capa real se disponível, senão placeholder
export function resolveExemplarCover(exemplar: any): string {
  // Se tem pdf_url e não é placeholder, usar como capa
  if (exemplar?.pdf_url && 
      !exemplar.pdf_url.includes('placeholder') && 
      exemplar.pdf_url.trim() !== '') {
    return exemplar.pdf_url;
  }
  
  // Usar placeholder apenas se realmente não houver capa válida
  return PLACEHOLDER_URL;
}

// Helper para capitalizar primeira letra
export function capitalize(text: string): string {
  if (!text) return '';
  return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
}

// Helpers de formatação
export function formatarData(inicio: string | Date, fim: string | Date): string {
  const inicioDate = typeof inicio === 'string' ? new Date(inicio) : inicio;
  const fimDate = typeof fim === 'string' ? new Date(fim) : fim;
  
  const formatoData = new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
  
  const inicioFormatado = formatoData.format(inicioDate);
  const fimFormatado = formatoData.format(fimDate);
  
  return inicioFormatado === fimFormatado 
    ? inicioFormatado
    : `${inicioFormatado} - ${fimFormatado}`;
}

export function formatarHorario(inicio: string | Date, fim: string | Date): string {
  const inicioDate = typeof inicio === 'string' ? new Date(inicio) : inicio;
  const fimDate = typeof fim === 'string' ? new Date(fim) : fim;
  
  const formatoHora = new Intl.DateTimeFormat('pt-BR', {
    hour: '2-digit',
    minute: '2-digit'
  });
  
  const inicioFormatado = formatoHora.format(inicioDate);
  const fimFormatado = formatoHora.format(fimDate);
  
  return `${inicioFormatado} - ${fimFormatado}`;
}
