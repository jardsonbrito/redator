import { useStudentAuth } from "@/hooks/useStudentAuth";
import { trackEventByEmail, TrackEventParams } from "@/utils/eventTracking";

export const useEventTracking = () => {
  const { studentData } = useStudentAuth();

  const trackEvent = async (params: Omit<TrackEventParams, 'studentEmail' | 'className'> & { 
    className?: string 
  }) => {
    if (!studentData.email) {
      console.warn('Evento não rastreado: email do aluno não disponível');
      return null;
    }

    return trackEventByEmail({
      ...params,
      studentEmail: studentData.email,
      className: params.className || studentData.turma || ''
    });
  };

  // Métodos de conveniência
  const trackEssaySubmitted = (temaId: string, isSimulado: boolean = false, metadata?: Record<string, any>) =>
    trackEvent({
      feature: isSimulado ? 'essay_simulado' : 'essay_regular',
      action: 'submitted',
      entityId: temaId,
      metadata
    });

  const trackLousaOpened = (lousaId: string) =>
    trackEvent({
      feature: 'lousa',
      action: 'opened',
      entityId: lousaId,
      metadata: { source: 'aluno' }
    });

  const trackLousaCompleted = (lousaId: string, charCount?: number) =>
    trackEvent({
      feature: 'lousa',
      action: 'completed',
      entityId: lousaId,
      metadata: { chars: charCount || 0, attachments: 0 }
    });

  const trackLiveParticipation = (liveId: string, participated: boolean) =>
    trackEvent({
      feature: 'live',
      action: participated ? 'participated' : 'not_participated',
      entityId: liveId
    });

  const trackVideoWatched = (videoId: string) =>
    trackEvent({
      feature: 'gravada',
      action: 'watched',
      entityId: videoId
    });

  return {
    trackEvent,
    trackEssaySubmitted,
    trackLousaOpened,
    trackLousaCompleted,
    trackLiveParticipation,
    trackVideoWatched,
    isReady: !!studentData.email
  };
};