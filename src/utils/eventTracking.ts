import { supabase } from "@/integrations/supabase/client";

export interface TrackEventParams {
  studentEmail: string;
  feature: 'essay_regular' | 'essay_simulado' | 'lousa' | 'live' | 'gravada';
  action: 'submitted' | 'opened' | 'completed' | 'participated' | 'not_participated' | 'watched';
  entityId?: string;
  className?: string;
  metadata?: Record<string, any>;
}

/**
 * Rastreia um evento de uso do aplicativo por e-mail do aluno
 */
export const trackEventByEmail = async (params: TrackEventParams): Promise<string | null> => {
  try {
    const { data, error } = await supabase.rpc('track_event_by_email', {
      p_student_email: params.studentEmail.toLowerCase(),
      p_feature: params.feature,
      p_action: params.action,
      p_entity_id: params.entityId || null,
      p_class_name: params.className || null,
      p_metadata: params.metadata || {}
    });

    if (error) {
      console.error('Erro ao rastrear evento:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Erro ao rastrear evento:', error);
    return null;
  }
};

/**
 * Exemplos de uso para instrumentação:
 */

// Redação Regular (enviar)
export const trackEssayRegularSubmitted = (studentEmail: string, temaId: string, turma: string, wordCount?: number) =>
  trackEventByEmail({
    studentEmail,
    feature: 'essay_regular',
    action: 'submitted',
    entityId: temaId,
    className: turma,
    metadata: { word_count: wordCount }
  });

// Redação Simulado (enviar)
export const trackEssaySimuladoSubmitted = (studentEmail: string, temaId: string, turma: string, simuladoName?: string) =>
  trackEventByEmail({
    studentEmail,
    feature: 'essay_simulado',
    action: 'submitted',
    entityId: temaId,
    className: turma,
    metadata: { simulado_name: simuladoName }
  });

// Lousa - "Responder" (abrir)
export const trackLousaOpened = (studentEmail: string, lousaId: string, turma: string) =>
  trackEventByEmail({
    studentEmail,
    feature: 'lousa',
    action: 'opened',
    entityId: lousaId,
    className: turma,
    metadata: { source: 'aluno' }
  });

// Lousa - "Enviar Resposta" (concluir)
export const trackLousaCompleted = (studentEmail: string, lousaId: string, turma: string, charCount?: number) =>
  trackEventByEmail({
    studentEmail,
    feature: 'lousa',
    action: 'completed',
    entityId: lousaId,
    className: turma,
    metadata: { chars: charCount, attachments: 0 }
  });

// Live - "Participei"
export const trackLiveParticipated = (studentEmail: string, liveId: string, turma: string) =>
  trackEventByEmail({
    studentEmail,
    feature: 'live',
    action: 'participated',
    entityId: liveId,
    className: turma,
    metadata: {}
  });

// Live - "Não participei"
export const trackLiveNotParticipated = (studentEmail: string, liveId: string, turma: string) =>
  trackEventByEmail({
    studentEmail,
    feature: 'live',
    action: 'not_participated',
    entityId: liveId,
    className: turma,
    metadata: {}
  });

// Gravada - "Assistir"
export const trackGravadaWatched = (studentEmail: string, videoId: string, turma: string) =>
  trackEventByEmail({
    studentEmail,
    feature: 'gravada',
    action: 'watched',
    entityId: videoId,
    className: turma,
    metadata: {}
  });