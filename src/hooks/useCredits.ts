import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface UseCreditsReturn {
  credits: number;
  loading: boolean;
  error: string | null;
  refreshCredits: () => Promise<void>;
  consumeCredits: (amount: number, reason?: string) => Promise<boolean>;
  checkSufficientCredits: (amount: number) => boolean;
  addCredits: (amount: number) => void;
}

export const useCredits = (userEmail?: string): UseCreditsReturn => {
  console.log('🔧 useCredits hook inicializado com email:', userEmail);

  const [credits, setCredits] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const addCredits = (amount: number) => {
    setCredits(prev => prev + amount);
  };

  const loadCredits = async () => {
    console.log('🔍 useCredits.loadCredits - INICIANDO');
    console.log('📧 Email recebido:', userEmail);

    if (!userEmail || userEmail.trim() === '') {
      console.log('❌ Email não fornecido ou vazio, parando aqui');
      setLoading(false);
      setCredits(0);
      setError(null);
      return;
    }

    const normalizedEmail = userEmail.toLowerCase().trim();
    console.log('📧 Email normalizado:', normalizedEmail);

    try {
      setLoading(true);

      // PRIORIDADE 1: Verificar se há créditos forçados no localStorage
      const forcedCredits = localStorage.getItem('forced_credits_' + normalizedEmail);
      if (forcedCredits) {
        const forcedValue = parseInt(forcedCredits);
        if (!isNaN(forcedValue)) {
          console.log('🔧 Usando créditos forçados do localStorage:', forcedValue);
          setCredits(forcedValue);
          setError(null);
          setLoading(false);
          return;
        }
      }

      // PRIORIDADE 2: Buscar do banco se não há créditos forçados
      console.log('🔄 Buscando créditos do banco...');
      const { data: credits, error } = await supabase
        .rpc('get_credits_by_email', { user_email: normalizedEmail });

      console.log('📊 Resultado do banco:', { data: credits, error });

      if (error) {
        console.error('❌ Erro na query RPC:', error);
        throw error;
      }

      const creditValue = credits || 0;
      setCredits(creditValue);
      setError(null);

      console.log('💰 Créditos do banco definidos:', creditValue);
    } catch (err) {
      console.error('💥 Erro ao carregar créditos:', err);
      setError('Erro ao carregar créditos');
      setCredits(0);
    } finally {
      setLoading(false);
      console.log('🏁 loadCredits finalizado');
    }
  };

  const consumeCredits = async (amount: number, reason?: string): Promise<boolean> => {
    console.log('💸 useCredits.consumeCredits - INICIANDO');
    console.log('📧 Email recebido:', userEmail);
    console.log('💰 Quantidade a consumir:', amount);
    console.log('💰 Créditos atuais no estado:', credits);
    console.log('🔍 Razão:', reason);

    if (!userEmail || userEmail.trim() === '') {
      console.log('❌ EMAIL NÃO ENCONTRADO OU VAZIO');
      toast({
        title: "Erro",
        description: "Email do usuário não encontrado",
        variant: "destructive"
      });
      return false;
    }

    try {
      // Verificar se tem créditos suficientes
      if (credits < amount) {
        console.log('❌ Créditos insuficientes:', { atual: credits, necessário: amount });
        toast({
          title: "Créditos Insuficientes",
          description: `Você precisa de ${amount} crédito(s) para enviar esta redação. Seus créditos atuais: ${credits}`,
          variant: "destructive"
        });
        return false;
      }

      // Buscar o usuário para obter o ID
      const { data: userData, error: userError } = await supabase
        .from('profiles')
        .select('id, nome, email, creditos')
        .eq('email', userEmail.toLowerCase().trim())
        .eq('user_type', 'aluno')
        .single();

      if (userError || !userData) {
        console.error('❌ Erro ao buscar usuário:', userError);
        throw userError || new Error('Usuário não encontrado');
      }

      console.log('👤 Usuário encontrado:', userData);

      // Para simulados (amount = 2), usar função específica que consume exatamente 2 créditos
      // Para outros casos (amount = 1), usar a função padrão
      let newCredits: number;
      if (amount === 2) {
        console.log('🔄 Chamando consume_credit_safe para simulado (2 créditos)...');

        // Chamar duas vezes a função que consume 1 crédito, ou implementar lógica específica
        const { data: firstResult, error: firstError } = await supabase
          .rpc('consume_credit_safe', {
            target_user_id: userData.id
          });

        if (firstError) {
          console.error('❌ Erro ao consumir primeiro crédito:', firstError);
          throw firstError;
        }

        const { data: secondResult, error: secondError } = await supabase
          .rpc('consume_credit_safe', {
            target_user_id: userData.id
          });

        if (secondError) {
          console.error('❌ Erro ao consumir segundo crédito:', secondError);
          throw secondError;
        }

        newCredits = secondResult;
        console.log('✅ 2 créditos consumidos com sucesso! Novos créditos:', newCredits);
      } else {
        console.log('🔄 Chamando consume_credit_safe...');
        const { data: result, error: consumeError } = await supabase
          .rpc('consume_credit_safe', {
            target_user_id: userData.id
          });

        if (consumeError) {
          console.error('❌ Erro ao consumir créditos:', consumeError);
          throw consumeError;
        }

        newCredits = result;
        console.log('✅ Créditos consumidos com sucesso! Novos créditos:', newCredits);
      }

      // Atualizar o estado local
      setCredits(newCredits);

      // Mostrar notificação de sucesso
      toast({
        title: "✅ Redação Enviada!",
        description: `${amount} crédito(s) utilizado(s) • Saldo: ${newCredits}`,
        className: "border-green-200 bg-green-50 text-green-900",
        duration: 4000
      });

      return true;
    } catch (err) {
      console.error('💥 ERRO CRÍTICO no consumeCredits:', err);
      toast({
        title: "Erro",
        description: "Erro ao processar créditos. Tente novamente.",
        variant: "destructive"
      });
      return false;
    }
  };

  const checkSufficientCredits = (amount: number): boolean => {
    console.log('🔍 Verificando créditos suficientes:', { atual: credits, necessário: amount });
    return credits >= amount;
  };

  const refreshCredits = async () => {
    console.log('🔄 Atualizando créditos...');

    // Limpar créditos forçados para garantir dados frescos do banco
    if (userEmail) {
      localStorage.removeItem('forced_credits_' + userEmail.toLowerCase().trim());
      console.log('🧹 Créditos forçados limpos do localStorage');
    }

    await loadCredits();
  };

  useEffect(() => {
    console.log('🔄 useCredits useEffect disparado - userEmail:', userEmail);
    loadCredits();
  }, [userEmail]);

  // Adicionar refresh automático a cada 30 segundos
  useEffect(() => {
    if (!userEmail) return;

    const interval = setInterval(() => {
      console.log('🔄 Refresh automático de créditos (30s)');
      loadCredits();
    }, 30000); // 30 segundos

    return () => clearInterval(interval);
  }, [userEmail]);

  // Adicionar refresh quando a janela volta ao foco
  useEffect(() => {
    if (!userEmail) return;

    const handleFocus = () => {
      console.log('🔄 Refresh de créditos por foco da janela');
      loadCredits();
    };

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        console.log('🔄 Refresh de créditos por visibility change');
        loadCredits();
      }
    };

    const handleCreditsUpdated = (event: CustomEvent) => {
      console.log('🔄 Refresh de créditos por evento personalizado:', event.detail);
      if (event.detail?.userEmail === userEmail.toLowerCase().trim()) {
        console.log('📧 Email corresponde, atualizando créditos...');

        // 1. Atualizar imediatamente o estado com o novo valor
        setCredits(event.detail.newCredits);
        console.log(`💰 Créditos atualizados via evento: ${credits} → ${event.detail.newCredits}`);

        // 2. Limpar localStorage de créditos forçados
        localStorage.removeItem('forced_credits_' + userEmail.toLowerCase().trim());

        // 3. Forçar reload dos dados do servidor após um pequeno delay
        setTimeout(() => {
          console.log('🔄 Executando refresh forçado dos créditos do servidor...');
          loadCredits();
        }, 1000);
      }
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('credits-updated', handleCreditsUpdated as EventListener);

    return () => {
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('credits-updated', handleCreditsUpdated as EventListener);
    };
  }, [userEmail]);

  console.log('📊 useCredits retornando:', { credits, loading, error });

  return {
    credits,
    loading,
    error,
    refreshCredits,
    consumeCredits,
    checkSufficientCredits,
    addCredits
  };
};
