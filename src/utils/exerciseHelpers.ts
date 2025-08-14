import { ExerciseStatus, ExerciseKind } from "@/components/shared/ExerciseCard";

const PLACEHOLDER = "/placeholders/aula-cover.png";

/**
 * Normaliza o status do exercício
 */
export function normalizeStatus(s?: string): ExerciseStatus {
  switch ((s || "").toLowerCase()) {
    case "agendado":
      return "agendado";
    case "disponível":
    case "disponivel":
      return "disponivel";
    case "encerrado":
    case "indisponivel":
    case "indisponível":
      return "encerrado";
    default:
      return "disponivel";
  }
}

/**
 * Normaliza o tipo do exercício
 */
export function normalizeKind(t?: string): ExerciseKind {
  const v = (t || "").toLowerCase();
  if (v.includes("google")) return "google_forms";
  return "frase_tematica";
}

/**
 * Obtém a URL da capa do exercício
 */
export function getCover(ex: any): string {
  return (
    ex?.cover_url ||
    ex?.cover_upload_url ||
    ex?.temas?.cover_url ||
    ex?.imagem_capa_url ||
    PLACEHOLDER
  );
}

/**
 * Formata data ISO
 */
export function formatISO(dt?: string): string | undefined {
  return dt || undefined;
}

/**
 * Converte dados do exercício para formato do card
 */
export function convertExerciseData(exercicio: any) {
  // Determinar status baseado na disponibilidade
  let status: ExerciseStatus = "disponivel";
  
  if (!exercicio.ativo) {
    status = "encerrado";
  } else if (exercicio.data_inicio && exercicio.hora_inicio) {
    const now = new Date();
    const startDate = new Date(`${exercicio.data_inicio}T${exercicio.hora_inicio}`);
    const endDate = exercicio.data_fim && exercicio.hora_fim 
      ? new Date(`${exercicio.data_fim}T${exercicio.hora_fim}`)
      : null;

    if (now < startDate) {
      status = "agendado";
    } else if (endDate && now > endDate) {
      status = "encerrado";
    } else {
      status = "disponivel";
    }
  }

  // Preparar datas ISO
  const startAt = exercicio.data_inicio && exercicio.hora_inicio 
    ? `${exercicio.data_inicio}T${exercicio.hora_inicio}` 
    : undefined;
    
  const endAt = exercicio.data_fim && exercicio.hora_fim 
    ? `${exercicio.data_fim}T${exercicio.hora_fim}` 
    : undefined;

  return {
    id: exercicio.id,
    coverUrl: getCover(exercicio),
    title: exercicio.titulo,
    status,
    kind: normalizeKind(exercicio.tipo),
    startAt,
    endAt,
    availableFrom: startAt, // Mesmo que startAt para este caso
    classes: exercicio.turmas_autorizadas || [],
    tags: exercicio.temas?.eixo_tematico ? [exercicio.temas.eixo_tematico] : [],
    originalData: exercicio
  };
}