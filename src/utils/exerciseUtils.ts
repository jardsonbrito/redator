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
  if (cover_url) {
    sources.push(cover_url + bust);
  }

  // 2. cover_upload_url (URL final do arquivo enviado)
  if (cover_upload_url) {
    sources.push(cover_upload_url + bust);
  }

  // 3. cover_upload_path (caminho de upload - campo legado)
  if (cover_upload_path) {
    sources.push(cover_upload_path + bust);
  }

  // 4. imagem_capa_url (campo legado)
  if (imagem_capa_url) {
    sources.push(imagem_capa_url + bust);
  }

  // 5. Herança do tema (para redações)
  if (tipo === 'Redação com Frase Temática' && temas) {
    if (temas.cover_file_path) {
      const { data } = supabase.storage
        .from('themes')
        .getPublicUrl(temas.cover_file_path);
      sources.push(data.publicUrl + bust);
    }
    if (temas.cover_url) {
      sources.push(temas.cover_url + bust);
    }
  }

  // 6. Placeholder (sempre como último fallback)
  sources.push(placeholder);

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
 * Verifica se um exercício está disponível baseado no período
 */
export function getExerciseAvailability(exercise: any) {
  if (!exercise?.data_inicio || !exercise?.hora_inicio || !exercise?.data_fim || !exercise?.hora_fim) {
    return { status: 'disponivel', message: '' }; // Sem período = sempre disponível se ativo
  }

  const agora = new Date();
  const inicioExercicio = parse(`${exercise.data_inicio}T${exercise.hora_inicio}`, "yyyy-MM-dd'T'HH:mm", new Date());
  const fimExercicio = parse(`${exercise.data_fim}T${exercise.hora_fim}`, "yyyy-MM-dd'T'HH:mm", new Date());

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
}

/**
 * Formata o período de atividade do exercício
 */
export function formatExercisePeriod(dataInicio?: string, horaInicio?: string, dataFim?: string, horaFim?: string): string {
  if (!dataInicio || !horaInicio || !dataFim || !horaFim) {
    return 'Período não definido';
  }

  const inicio = parse(`${dataInicio}T${horaInicio}`, "yyyy-MM-dd'T'HH:mm", new Date());
  const fim = parse(`${dataFim}T${horaFim}`, "yyyy-MM-dd'T'HH:mm", new Date());

  const inicioFormatado = format(inicio, "dd/MM 'às' HH:mm", { locale: ptBR });
  const fimFormatado = format(fim, "dd/MM 'às' HH:mm", { locale: ptBR });

  return `${inicioFormatado} até ${fimFormatado}`;
}

/**
 * Valida se o período do exercício é válido
 */
export function validateExercisePeriod(dataInicio?: string, horaInicio?: string, dataFim?: string, horaFim?: string): boolean {
  if (!dataInicio || !horaInicio || !dataFim || !horaFim) {
    return false;
  }

  const inicio = parse(`${dataInicio}T${horaInicio}`, "yyyy-MM-dd'T'HH:mm", new Date());
  const fim = parse(`${dataFim}T${horaFim}`, "yyyy-MM-dd'T'HH:mm", new Date());

  return fim > inicio;
}