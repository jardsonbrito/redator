import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useStudentAuth } from '@/hooks/useStudentAuth';
import { useEventTracking } from '@/hooks/useEventTracking';

export interface RecordedLessonView {
  lesson_id: string;
  first_watched_at: string;
}

export function useRecordedLessonViews() {
  const [isMarking, setIsMarking] = useState(false);
  const { toast } = useToast();
  const { studentData } = useStudentAuth();
  const { trackVideoWatched } = useEventTracking();
  const queryClient = useQueryClient();

  // Buscar mapa de visualizações do usuário
  const { data: viewsMap = {}, isLoading } = useQuery({
    queryKey: ['recorded-lesson-views-map', studentData.email],
    queryFn: async () => {
      if (!studentData.email) return {};
      
      const { data, error } = await supabase.rpc('get_recorded_lesson_views_map');
      
      if (error) {
        console.error('Erro ao buscar visualizações:', error);
        return {};
      }

      // Converter array para mapa lesson_id -> first_watched_at
      return Object.fromEntries(
        (data || []).map((view: RecordedLessonView) => [
          view.lesson_id, 
          view.first_watched_at
        ])
      );
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
          title: "Aula marcada como assistida!",
          description: `${lessonTitle || 'Aula'} foi adicionada às suas conquistas.`,
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

  // Verificar se aula foi assistida
  const isWatched = (lessonId: string) => {
    return !!viewsMap[lessonId];
  };

  // Obter data da primeira visualização
  const getWatchedDate = (lessonId: string) => {
    return viewsMap[lessonId] || null;
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
    refetchOnWindowFocus: false,
  });

  return {
    viewsMap,
    isLoading,
    isMarking,
    markAsWatched,
    isWatched,
    getWatchedDate,
    monthlyCount
  };
}