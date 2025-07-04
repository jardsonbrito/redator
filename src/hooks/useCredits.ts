
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export const useCredits = () => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const getCreditsbyEmail = async (email: string): Promise<number> => {
    try {
      console.log('🔍 Buscando créditos para email:', email);
      
      if (!email || email.trim() === '') {
        console.log('❌ Email vazio fornecido');
        return 0;
      }

      const { data, error } = await supabase.rpc('get_credits_by_email', {
        user_email: email.trim().toLowerCase()
      });

      if (error) {
        console.error('❌ Erro ao buscar créditos:', error);
        throw error;
      }

      console.log('✅ Créditos encontrados:', data);
      return data || 0;
    } catch (error: any) {
      console.error('❌ Erro ao buscar créditos:', error);
      return 0;
    }
  };

  const addCredits = async (userId: string, amount: number): Promise<boolean> => {
    setLoading(true);
    try {
      console.log('💳 Adicionando créditos:', { userId, amount });
      
      const { data, error } = await supabase.rpc('add_credits_safe', {
        target_user_id: userId,
        credit_amount: amount
      });

      if (error) throw error;

      toast({
        title: "Créditos atualizados",
        description: `${amount > 0 ? 'Adicionados' : 'Removidos'} ${Math.abs(amount)} créditos com sucesso.`
      });

      console.log('✅ Créditos atualizados com sucesso');
      return true;
    } catch (error: any) {
      console.error('❌ Erro ao gerenciar créditos:', error);
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
      console.log('🔥 Consumindo créditos:', { userId, amount });
      
      for (let i = 0; i < amount; i++) {
        const { data, error } = await supabase.rpc('consume_credit_safe', {
          target_user_id: userId
        });

        if (error) throw error;
        console.log(`✅ Crédito ${i + 1} consumido. Créditos restantes:`, data);
      }

      return true;
    } catch (error: any) {
      console.error('❌ Erro ao consumir créditos:', error);
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
