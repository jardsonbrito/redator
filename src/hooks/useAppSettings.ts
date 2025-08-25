import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface AppSettings {
  submission_allowed_weekdays_for_topics: number[];
  free_topic_enabled: boolean;
  updated_at: string;
}

export const useAppSettings = () => {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const loadSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('public_app_settings')
        .select('*')
        .single();

      if (error) throw error;
      setSettings(data);
    } catch (error) {
      console.error('Erro ao carregar configurações:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateSettings = async (
    weekdays: number[],
    freeTopicEnabled: boolean
  ): Promise<boolean> => {
    try {
      setLoading(true);
      
      const { error } = await supabase.rpc('set_app_settings', {
        p_weekdays_for_topics: weekdays,
        p_free_topic_enabled: freeTopicEnabled
      });

      if (error) throw error;

      toast({
        title: 'Configurações atualizadas',
        description: 'As alterações foram salvas com sucesso.',
      });

      // Recarregar configurações
      await loadSettings();
      return true;
    } catch (error: any) {
      console.error('Erro ao atualizar configurações:', error);
      toast({
        title: 'Erro ao salvar',
        description: error.message || 'Erro interno do servidor.',
        variant: 'destructive',
      });
      return false;
    } finally {
      setLoading(false);
    }
  };

  const checkIfTodayAllowsTopicSubmissions = (): boolean => {
    if (!settings) return false;
    
    const today = new Date().getDay(); // 0=Dom, 1=Seg, ..., 6=Sáb
    return settings.submission_allowed_weekdays_for_topics.includes(today);
  };

  const getDaysAllowedText = (): string => {
    if (!settings) return '';
    
    const dayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    return settings.submission_allowed_weekdays_for_topics
      .map(day => dayNames[day])
      .join(', ');
  };

  useEffect(() => {
    loadSettings();
  }, []);

  return {
    settings,
    loading,
    updateSettings,
    loadSettings,
    checkIfTodayAllowsTopicSubmissions,
    getDaysAllowedText,
  };
};