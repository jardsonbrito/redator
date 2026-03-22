import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface UseJarvisCreditsReturn {
  credits: number;
  loading: boolean;
  error: string | null;
  refreshCredits: () => Promise<void>;
}

export const useJarvisCredits = (userEmail?: string): UseJarvisCreditsReturn => {
  console.log('🤖 useJarvisCredits inicializado com email:', userEmail);

  const [credits, setCredits] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const loadCredits = async () => {
    console.log('🔍 Carregando créditos Jarvis...');

    if (!userEmail || userEmail.trim() === '') {
      console.log('❌ Email não fornecido');
      setLoading(false);
      setCredits(0);
      return;
    }

    const normalizedEmail = userEmail.toLowerCase().trim();

    try {
      setLoading(true);

      // Chamar RPC específica do Jarvis
      const { data: jarvisCredits, error } = await supabase
        .rpc('get_jarvis_credits_by_email', { user_email: normalizedEmail });

      console.log('📊 Créditos Jarvis retornados:', jarvisCredits);

      if (error) {
        console.error('❌ Erro ao buscar créditos Jarvis:', error);
        throw error;
      }

      setCredits(jarvisCredits || 0);
      setError(null);

    } catch (err) {
      console.error('💥 Erro ao carregar créditos Jarvis:', err);
      setError('Erro ao carregar créditos do Jarvis');
      setCredits(0);
    } finally {
      setLoading(false);
    }
  };

  const refreshCredits = async () => {
    console.log('🔄 Atualizando créditos Jarvis...');
    await loadCredits();
  };

  useEffect(() => {
    loadCredits();
  }, [userEmail]);

  // Refresh automático a cada 30 segundos
  useEffect(() => {
    if (!userEmail) return;

    const interval = setInterval(() => {
      console.log('🔄 Refresh automático de créditos Jarvis (30s)');
      loadCredits();
    }, 30000);

    return () => clearInterval(interval);
  }, [userEmail]);

  // Refresh ao focar janela
  useEffect(() => {
    if (!userEmail) return;

    const handleFocus = () => {
      console.log('🔄 Refresh créditos Jarvis (foco)');
      loadCredits();
    };

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        console.log('🔄 Refresh créditos Jarvis (visibility)');
        loadCredits();
      }
    };

    const handleJarvisCreditsUpdated = (event: CustomEvent) => {
      console.log('🔄 Refresh créditos Jarvis (evento)', event.detail);
      if (event.detail?.userEmail === userEmail.toLowerCase().trim()) {
        console.log('📧 Email corresponde, atualizando créditos Jarvis...');
        setCredits(event.detail.newCredits);

        // Refresh forçado do servidor após delay
        setTimeout(() => {
          console.log('🔄 Executando refresh forçado...');
          loadCredits();
        }, 1000);
      }
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('jarvis-credits-updated', handleJarvisCreditsUpdated as EventListener);

    return () => {
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('jarvis-credits-updated', handleJarvisCreditsUpdated as EventListener);
    };
  }, [userEmail]);

  console.log('📊 useJarvisCredits retornando:', { credits, loading, error });

  return {
    credits,
    loading,
    error,
    refreshCredits
  };
};
