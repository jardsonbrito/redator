import { supabase } from "@/integrations/supabase/client";
import { format, isWithinInterval, parse, isBefore } from "date-fns";
import { ptBR } from "date-fns/locale/pt-BR";

/**
 * Upload de capa de exercício
 */
export async function uploadExerciseCover(file: File): Promise<string | null> {
  try {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random()}.${fileExt}`;
    const filePath = `exercise-covers/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('exercises')
      .upload(filePath, file);

    if (uploadError) throw uploadError;

    const { data } = supabase.storage
      .from('exercises')
      .getPublicUrl(filePath);

    return data.publicUrl;
  } catch (error) {
    console.error('Erro no upload da capa:', error);
    return null;
  }
}

/**
 * Função utilitária para selecionar as fontes de imagem com prioridade e cache-busting
 * Conforme especificação técnica: cover_url > cover_upload_url > herança do tema > placeholder
 */
export function pickCoverImage({ 
  cover_url, 
  cover_upload_url, 
  cover_upload_path,
  imagem_capa_url,
  placeholder = '/placeholders/aula-cover.png', 
  updated_at,
  temas,
  tipo 
}: {
  cover_url?: string;
  cover_upload_url?: string;
  cover_upload_path?: string;
  imagem_capa_url?: string;
  placeholder?: string;
  updated_at?: string;
  temas?: any;
  tipo?: string;
}): string[] {
  const bust = updated_at ? `?v=${new Date(updated_at).getTime()}` : '';
  const sources: string[] = [];

  // 1. Prioridade: cover_url (URL informada manualmente)
  if (cover_url && cover_url.trim()) {
    sources.push(cover_url.trim() + bust);
  }

  // 2. cover_upload_url (URL final do arquivo enviado)
  if (cover_upload_url && cover_upload_url.trim()) {
    sources.push(cover_upload_url.trim() + bust);
  }

  // 3. cover_upload_path (caminho de upload - campo legado)
  if (cover_upload_path && cover_upload_path.trim()) {
    sources.push(cover_upload_path.trim() + bust);
  }

  // 4. imagem_capa_url (campo legado)
  if (imagem_capa_url && imagem_capa_url.trim()) {
    sources.push(imagem_capa_url.trim() + bust);
  }

  // 5. Herança do tema (para redações)
  if (tipo === 'Redação com Frase Temática' && temas) {
    if (temas.cover_file_path && temas.cover_file_path.trim()) {
      const { data } = supabase.storage
        .from('themes')
        .getPublicUrl(temas.cover_file_path.trim());
      sources.push(data.publicUrl + bust);
    }
    if (temas.cover_url && temas.cover_url.trim()) {
      sources.push(temas.cover_url.trim() + bust);
    }
  }

  // 6. Placeholder (sempre como último fallback)
  sources.push(placeholder);

  console.log('🖼️ Fontes de imagem geradas:', sources);
  return sources;
}

/**
 * Função legada mantida para compatibilidade - usa a nova lógica internamente
 * @deprecated Use pickCoverImage para maior controle sobre fallbacks
 */
export function getEffectiveCover(exercise: any): string {
  const sources = pickCoverImage({
    cover_url: exercise?.cover_url,
    cover_upload_url: exercise?.cover_upload_url,
    cover_upload_path: exercise?.cover_upload_path,
    imagem_capa_url: exercise?.imagem_capa_url,
    updated_at: exercise?.updated_at,
    temas: exercise?.temas,
    tipo: exercise?.tipo
  });
  
  return sources[0] || '/placeholders/aula-cover.png';
}

/**
 * Normaliza o formato de tempo para HH:mm (remove segundos se presentes)
 */
function normalizeTime(time: string): string {
  if (!time) return time;
  // Remove segundos se presentes (HH:mm:ss -> HH:mm)
  return time.split(':').slice(0, 2).join(':');
}

/**
 * Verifica se um exercício está disponível baseado no período
 */
export function getExerciseAvailability(exercise: any) {
  // Validação mais robusta: verificar se os valores não são apenas não-null, mas também não são strings vazias
  if (!exercise?.data_inicio?.trim() || !exercise?.hora_inicio?.trim() || !exercise?.data_fim?.trim() || !exercise?.hora_fim?.trim()) {
    return { status: 'disponivel', message: '' }; // Sem período = sempre disponível se ativo
  }

  try {
    const agora = new Date();
    
    // Normalizar horários (remover segundos se presentes)
    const horaInicioNorm = normalizeTime(exercise.hora_inicio.trim());
    const horaFimNorm = normalizeTime(exercise.hora_fim.trim());
    
    const inicioExercicio = parse(`${exercise.data_inicio.trim()}T${horaInicioNorm}`, "yyyy-MM-dd'T'HH:mm", new Date());
    const fimExercicio = parse(`${exercise.data_fim.trim()}T${horaFimNorm}`, "yyyy-MM-dd'T'HH:mm", new Date());

    // Verificar se as datas são válidas
    if (isNaN(inicioExercicio.getTime()) || isNaN(fimExercicio.getTime())) {
      console.warn('Datas inválidas no exercício:', {
        dataInicio: exercise.data_inicio,
        horaInicio: exercise.hora_inicio,
        horaInicioNorm,
        dataFim: exercise.data_fim,
        horaFim: exercise.hora_fim,
        horaFimNorm
      });
      return { status: 'disponivel', message: '' };
    }

    if (isBefore(agora, inicioExercicio)) {
      return { 
        status: 'agendado', 
        message: `Disponível a partir de ${format(inicioExercicio, "dd/MM 'às' HH:mm", { locale: ptBR })}` 
      };
    } 
    
    if (isWithinInterval(agora, { start: inicioExercicio, end: fimExercicio })) {
      return { 
        status: 'disponivel', 
        message: `Disponível até ${format(fimExercicio, "dd/MM 'às' HH:mm", { locale: ptBR })}` 
      };
    } 
    
    return { 
      status: 'encerrado', 
      message: `Encerrado em ${format(fimExercicio, "dd/MM 'às' HH:mm", { locale: ptBR })}` 
    };
  } catch (error) {
    console.error('Erro ao processar datas do exercício:', error, exercise);
    return { status: 'disponivel', message: '' };
  }
}

/**
 * Formata o período de atividade do exercício
 */
export function formatExercisePeriod(dataInicio?: string, horaInicio?: string, dataFim?: string, horaFim?: string): string {
  if (!dataInicio?.trim() || !horaInicio?.trim() || !dataFim?.trim() || !horaFim?.trim()) {
    return 'Período não definido';
  }

  try {
    // Normalizar horários (remover segundos se presentes)
    const horaInicioNorm = normalizeTime(horaInicio.trim());
    const horaFimNorm = normalizeTime(horaFim.trim());
    
    const inicio = parse(`${dataInicio.trim()}T${horaInicioNorm}`, "yyyy-MM-dd'T'HH:mm", new Date());
    const fim = parse(`${dataFim.trim()}T${horaFimNorm}`, "yyyy-MM-dd'T'HH:mm", new Date());

    // Verificar se as datas são válidas
    if (isNaN(inicio.getTime()) || isNaN(fim.getTime())) {
      console.warn('Erro ao formatar período - datas inválidas:', {
        dataInicio, horaInicio, horaInicioNorm,
        dataFim, horaFim, horaFimNorm
      });
      return 'Período inválido';
    }

    const inicioFormatado = format(inicio, "dd/MM 'às' HH:mm", { locale: ptBR });
    const fimFormatado = format(fim, "dd/MM 'às' HH:mm", { locale: ptBR });

    return `${inicioFormatado} até ${fimFormatado}`;
  } catch (error) {
    console.error('Erro ao formatar período:', error);
    return 'Período inválido';
  }
}

/**
 * Valida se o período do exercício é válido
 */
export function validateExercisePeriod(dataInicio?: string, horaInicio?: string, dataFim?: string, horaFim?: string): boolean {
  if (!dataInicio?.trim() || !horaInicio?.trim() || !dataFim?.trim() || !horaFim?.trim()) {
    return false;
  }

  try {
    // Normalizar horários (remover segundos se presentes)
    const horaInicioNorm = normalizeTime(horaInicio.trim());
    const horaFimNorm = normalizeTime(horaFim.trim());
    
    const inicio = parse(`${dataInicio.trim()}T${horaInicioNorm}`, "yyyy-MM-dd'T'HH:mm", new Date());
    const fim = parse(`${dataFim.trim()}T${horaFimNorm}`, "yyyy-MM-dd'T'HH:mm", new Date());

    // Verificar se as datas são válidas
    if (isNaN(inicio.getTime()) || isNaN(fim.getTime())) {
      return false;
    }

    return fim > inicio;
  } catch (error) {
    console.error('Erro na validação do período:', error);
    return false;
  }
}