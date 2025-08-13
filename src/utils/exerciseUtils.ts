import { supabase } from "@/integrations/supabase/client";
import { format, isWithinInterval, parseISO, isBefore } from "date-fns";
import { ptBR } from "date-fns/locale";

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
 * Resolve a capa efetiva do exercício seguindo a precedência:
 * Upload > URL > Herança do Tema > Placeholder
 */
export function getEffectiveCover(exercise: any): string {
  const placeholder = '/placeholders/aula-cover.png';
  
  // 1. Upload tem precedência
  if (exercise?.cover_upload_path) {
    return exercise.cover_upload_path;
  }
  
  // 2. URL manual
  if (exercise?.cover_url) {
    return exercise.cover_url;
  }
  
  // 3. URL da imagem de capa (campo legado)
  if (exercise?.imagem_capa_url) {
    return exercise.imagem_capa_url;
  }
  
  // 4. Herança do tema (para redações)
  if (exercise?.tipo === 'Redação com Frase Temática' && exercise?.temas?.cover_url) {
    return exercise.temas.cover_url;
  }
  
  // 5. Placeholder
  return placeholder;
}

/**
 * Verifica se um exercício está disponível baseado no período
 */
export function getExerciseAvailability(exercise: any) {
  if (!exercise?.data_inicio || !exercise?.hora_inicio || !exercise?.data_fim || !exercise?.hora_fim) {
    return { status: 'disponivel', message: '' }; // Sem período = sempre disponível se ativo
  }

  const agora = new Date();
  const inicioExercicio = parseISO(`${exercise.data_inicio}T${exercise.hora_inicio}`);
  const fimExercicio = parseISO(`${exercise.data_fim}T${exercise.hora_fim}`);

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

  const inicio = parseISO(`${dataInicio}T${horaInicio}`);
  const fim = parseISO(`${dataFim}T${horaFim}`);

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

  const inicio = parseISO(`${dataInicio}T${horaInicio}`);
  const fim = parseISO(`${dataFim}T${horaFim}`);

  return fim > inicio;
}