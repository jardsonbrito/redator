
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export const useCredits = () => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const getCreditsbyEmail = async (email: string): Promise<number> => {
    try {
      const { data, error } = await supabase.rpc('get_credits_by_email', {
        user_email: email
      });

      if (error) throw error;
      return data || 0;
    } catch (error: any) {
      console.error('Erro ao buscar créditos:', error);
      return 0;
    }
  };

  const addCredits = async (userId: string, amount: number): Promise<boolean> => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('add_credits_safe', {
        target_user_id: userId,
        credit_amount: amount
      });

      if (error) throw error;

      toast({
        title: "Créditos atualizados",
        description: `${amount > 0 ? 'Adicionados' : 'Removidos'} ${Math.abs(amount)} créditos com sucesso.`
      });

      return true;
    } catch (error: any) {
      console.error('Erro ao gerenciar créditos:', error);
      toast({
        title: "Erro ao atualizar créditos",
        description: error.message || "Ocorreu um erro inesperado.",
        variant: "destructive"
      });
      return false;
    } finally {
      setLoading(false);
    }
  };

  const consumeCredits = async (userId: string, amount: number): Promise<boolean> => {
    setLoading(true);
    try {
      for (let i = 0; i < amount; i++) {
        const { data, error } = await supabase.rpc('consume_credit_safe', {
          target_user_id: userId
        });

        if (error) throw error;
      }

      return true;
    } catch (error: any) {
      console.error('Erro ao consumir créditos:', error);
      return false;
    } finally {
      setLoading(false);
    }
  };

  return {
    getCreditsbyEmail,
    addCredits,
    consumeCredits,
    loading
  };
};
