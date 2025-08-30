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
}

export const useCredits = (userEmail?: string): UseCreditsReturn => {
  const [credits, setCredits] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const loadCredits = async () => {
    if (!userEmail) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('creditos')
        .eq('email', userEmail.toLowerCase().trim())
        .eq('user_type', 'aluno')
        .single();

      if (error) throw error;
      setCredits(data?.creditos || 0);
      setError(null);
    } catch (err) {
      console.error('Erro ao carregar créditos:', err);
      setError('Erro ao carregar créditos');
      setCredits(0);
    } finally {
      setLoading(false);
    }
  };

  const consumeCredits = async (amount: number, reason?: string): Promise<boolean> => {
    if (!userEmail) {
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
        toast({
          title: "Créditos Insuficientes",
          description: `Você precisa de ${amount} crédito(s) para enviar esta redação. Seus créditos atuais: ${credits}`,
          variant: "destructive"
        });
        return false;
      }

      const newCredits = credits - amount;

      // Buscar o ID do usuário
      const { data: userData, error: userError } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', userEmail.toLowerCase().trim())
        .eq('user_type', 'aluno')
        .single();

      if (userError) throw userError;

      // Atualizar créditos
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ creditos: newCredits })
        .eq('id', userData.id);

      if (updateError) throw updateError;

      // Registrar no audit
      const { error: auditError } = await supabase
        .from('credit_audit')
        .insert({
          user_id: userData.id,
          admin_id: null,
          action: 'remove',
          old_credits: credits,
          new_credits: newCredits
        });

      if (auditError) {
        console.warn('Erro ao registrar audit (não crítico):', auditError);
      }

      const oldCredits = credits;
      setCredits(newCredits);

      // Mostrar notificação verde de sucesso com informações dos créditos
      toast({
        title: "✅ Créditos Debitados com Sucesso!",
        description: `Redação enviada para correção! • Créditos anteriores: ${oldCredits} • Créditos utilizados: -${amount} • Saldo atual: ${newCredits}`,
        className: "border-green-200 bg-green-50 text-green-900",
        duration: 6000
      });

      return true;
    } catch (err) {
      console.error('Erro ao consumir créditos:', err);
      toast({
        title: "Erro",
        description: "Erro ao processar créditos. Tente novamente.",
        variant: "destructive"
      });
      return false;
    }
  };

  const checkSufficientCredits = (amount: number): boolean => {
    return credits >= amount;
  };

  const refreshCredits = async () => {
    await loadCredits();
  };

  useEffect(() => {
    loadCredits();
  }, [userEmail]);

  return {
    credits,
    loading,
    error,
    refreshCredits,
    consumeCredits,
    checkSufficientCredits
  };
};