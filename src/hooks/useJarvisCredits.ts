import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface UseJarvisCreditsReturn {
  credits: number;
  loading: boolean;
  error: string | null;
  refreshCredits: () => Promise<void>;
}

export const useJarvisCredits = (userEmail?: string): UseJarvisCreditsReturn => {
  const [credits, setCredits] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadCredits = useCallback(async () => {
    if (!userEmail || userEmail.trim() === '') {
      setLoading(false);
      setCredits(0);
      return;
    }

    const normalizedEmail = userEmail.toLowerCase().trim();

    try {
      setLoading(true);

      const { data: jarvisCredits, error: rpcError } = await supabase
        .rpc('get_jarvis_credits_by_email', { user_email: normalizedEmail });

      if (rpcError) throw rpcError;

      setCredits(jarvisCredits || 0);
      setError(null);
    } catch (err) {
      console.error('Erro ao carregar créditos Jarvis:', err);
      setError('Erro ao carregar créditos do Jarvis');
      setCredits(0);
    } finally {
      setLoading(false);
    }
  }, [userEmail]);

  // Carrega ao montar e quando o email mudar
  useEffect(() => {
    loadCredits();
  }, [loadCredits]);

  // Refresh automático a cada 30 segundos
  useEffect(() => {
    if (!userEmail) return;
    const interval = setInterval(loadCredits, 30000);
    return () => clearInterval(interval);
  }, [userEmail, loadCredits]);

  // Refresh ao focar janela ou voltar aba
  useEffect(() => {
    if (!userEmail) return;

    const handleFocus = () => loadCredits();
    const handleVisibility = () => { if (!document.hidden) loadCredits(); };

    const handleCreditsUpdated = (event: CustomEvent) => {
      if (event.detail?.userEmail === userEmail.toLowerCase().trim()) {
        setCredits(event.detail.newCredits);
        // Confirma com o servidor após 1s
        setTimeout(loadCredits, 1000);
      }
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('jarvis-credits-updated', handleCreditsUpdated as EventListener);

    return () => {
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('jarvis-credits-updated', handleCreditsUpdated as EventListener);
    };
  }, [userEmail, loadCredits]);

  return { credits, loading, error, refreshCredits: loadCredits };
};
