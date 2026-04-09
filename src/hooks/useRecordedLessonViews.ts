import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useStudentAuth } from '@/hooks/useStudentAuth';
import { useEventTracking } from '@/hooks/useEventTracking';

export interface RecordedLessonView {
  lesson_id: string;
  first_watched_at: string;
  confirmed_at: string | null;
}

export function useRecordedLessonViews() {
  const [isMarking, setIsMarking] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const { toast } = useToast();
  const { studentData } = useStudentAuth();
  const { trackVideoWatched } = useEventTracking();
  const queryClient = useQueryClient();

  // Buscar mapa de visualizações via RPC (SECURITY DEFINER — contorna RLS customizada)
  // Retorna: lesson_id → { first_watched_at, confirmed_at }
  const { data: viewsMap = {}, isLoading } = useQuery({
    queryKey: ['recorded-lesson-views-map', studentData.email],
    queryFn: async () => {
      if (!studentData.email) return {};

      const { data, error } = await supabase.rpc('get_recorded_lesson_views_map', {
        p_student_email: studentData.email,
      });

      if (error) {
        console.error('Erro ao buscar visualizações:', error);
        return {};
      }

      return Object.fromEntries(
        (data || []).map((view: RecordedLessonView) => [
          view.lesson_id,
          { first_watched_at: view.first_watched_at, confirmed_at: view.confirmed_at ?? null },
        ])
      ) as Record<string, { first_watched_at: string; confirmed_at: string | null }>;
    },
    enabled: !!studentData.email,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
  });

  // Marcar aula como assistida
  const markAsWatched = async (lessonId: string, lessonTitle?: string) => {
    if (!studentData.email || !studentData.nomeUsuario) {
      toast({
        title: "Erro",
        description: "Você precisa estar logado para registrar a visualização.",
        variant: "destructive"
      });
      return false;
    }

    setIsMarking(true);

    try {
      // Chamar RPC para marcar como assistida
      const { data, error } = await supabase.rpc('mark_recorded_lesson_view', {
        p_lesson_id: lessonId,
        p_student_email: studentData.email,
        p_student_name: studentData.nomeUsuario
      });

      if (error) {
        console.error('Erro ao marcar aula como assistida:', error);
        toast({
          title: "Erro",
          description: "Não foi possível registrar a visualização. Tente novamente.",
          variant: "destructive"
        });
        return false;
      }

      // Verificar se foi primeira visualização (nova)
      const isNewView = !viewsMap[lessonId];

      if (isNewView) {
        toast({
          title: "Vídeo aberto!",
          description: `Ao terminar, clique em "Confirmar que assisti" para registrar no seu progresso.`,
        });

        // Registrar evento de telemetria
        await trackVideoWatched(lessonId);
      }

      // Invalidar queries relacionadas
      await Promise.all([
        queryClient.invalidateQueries({ 
          queryKey: ['recorded-lesson-views-map', studentData.email] 
        }),
        queryClient.invalidateQueries({ 
          queryKey: ['conquistas', studentData.email] 
        }),
        queryClient.invalidateQueries({ 
          queryKey: ['radar-gravadas'] 
        }),
        queryClient.invalidateQueries({ 
          queryKey: ['monthly-recorded-lessons-count'] 
        }),
      ]);

      return true;

    } catch (error) {
      console.error('Erro inesperado ao marcar aula:', error);
      toast({
        title: "Erro inesperado",
        description: "Ocorreu um erro inesperado. Tente novamente.",
        variant: "destructive"
      });
      return false;
    } finally {
      setIsMarking(false);
    }
  };

  // Confirmar explicitamente que o aluno assistiu (define confirmed_at via RPC)
  const confirmAsWatched = async (lessonId: string, lessonTitle?: string) => {
    if (!studentData.email) return false;
    setIsConfirming(true);
    try {
      const { data: confirmado, error } = await supabase.rpc('confirm_recorded_lesson_view', {
        p_lesson_id: lessonId,
        p_student_email: studentData.email,
      });

      if (error) {
        console.error('Erro ao confirmar visualização:', error);
        toast({
          title: 'Erro',
          description: 'Não foi possível confirmar. Tente novamente.',
          variant: 'destructive',
        });
        return false;
      }

      if (!confirmado) {
        // Já havia sido confirmada antes — não mostra toast de erro, só atualiza
        await queryClient.invalidateQueries({ queryKey: ['recorded-lesson-views-map', studentData.email] });
        return true;
      }

      toast({
        title: '✓ Aula confirmada!',
        description: `${lessonTitle || 'Aula'} foi registrada no seu progresso.`,
      });

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['recorded-lesson-views-map', studentData.email] }),
        queryClient.invalidateQueries({ queryKey: ['conquistas', studentData.email] }),
        queryClient.invalidateQueries({ queryKey: ['radar-gravadas'] }),
        queryClient.invalidateQueries({ queryKey: ['monthly-recorded-lessons-count'] }),
      ]);

      return true;
    } finally {
      setIsConfirming(false);
    }
  };

  // Verificar se aula foi aberta (first_watched_at preenchido)
  const isWatched = (lessonId: string) => {
    return !!viewsMap[lessonId];
  };

  // Verificar se o aluno confirmou explicitamente que assistiu (confirmed_at preenchido)
  const isConfirmed = (lessonId: string) => {
    return !!viewsMap[lessonId]?.confirmed_at;
  };

  // Obter data da primeira visualização
  const getWatchedDate = (lessonId: string) => {
    return viewsMap[lessonId]?.first_watched_at || null;
  };

  // Contar total de aulas assistidas no mês atual
  const { data: monthlyCount = 0 } = useQuery({
    queryKey: ['monthly-recorded-lessons-count', studentData.email],
    queryFn: async () => {
      if (!studentData.email) return 0;
      
      const { data, error } = await supabase.rpc('count_monthly_recorded_lessons', {
        p_student_email: studentData.email
      });
      
      if (error) {
        console.error('Erro ao contar aulas do mês:', error);
        return 0;
      }
      
      return data || 0;
    },
    enabled: !!studentData.email,
    refetchOnMount: true,
    refetchOnWindowFocus: true, // Forçar refetch
    staleTime: 0, // Sempre considerar dados como antigos
  });

  return {
    viewsMap,
    isLoading,
    isMarking,
    isConfirming,
    markAsWatched,
    confirmAsWatched,
    isWatched,
    isConfirmed,
    getWatchedDate,
    monthlyCount,
  };
}