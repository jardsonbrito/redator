
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

      // Normalizar email
      const normalizedEmail = email.trim().toLowerCase();
      console.log('📧 Email normalizado:', normalizedEmail);

      // Buscar na tabela profiles onde user_type = 'aluno'
      const { data, error } = await supabase
        .from('profiles')
        .select('creditos, nome, email, user_type')
        .eq('email', normalizedEmail)
        .eq('user_type', 'aluno')
        .single();

      if (error) {
        console.error('❌ Erro ao buscar créditos:', error);
        
        // Se não encontrou o aluno, verificar se existe com outro user_type
        const { data: allProfiles } = await supabase
          .from('profiles')
          .select('email, user_type, creditos')
          .eq('email', normalizedEmail);
        
        console.log('🔍 Perfis encontrados para este email:', allProfiles);
        
        return 0;
      }

      console.log('✅ Dados do aluno encontrados:', data);
      const credits = data?.creditos || 0;
      console.log('💰 Créditos retornados:', credits);
      
      return credits;
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

  // Nova função para consumir créditos por email
  const consumeCreditsByEmail = async (email: string, amount: number): Promise<boolean> => {
    setLoading(true);
    try {
      console.log('🔥 Consumindo créditos por email:', { email, amount });
      
      // Buscar o usuário pelo email
      const { data: user, error: userError } = await supabase
        .from('profiles')
        .select('id, creditos, nome')
        .eq('email', email.trim().toLowerCase())
        .eq('user_type', 'aluno')
        .single();

      if (userError || !user) {
        console.error('❌ Usuário não encontrado:', userError);
        return false;
      }

      console.log('👤 Usuário encontrado:', user);

      // Verificar se tem créditos suficientes
      if (user.creditos < amount) {
        console.error('❌ Créditos insuficientes:', user.creditos, 'necessários:', amount);
        return false;
      }

      // Consumir créditos diretamente no banco
      const newCredits = user.creditos - amount;
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ creditos: newCredits })
        .eq('id', user.id);

      if (updateError) {
        console.error('❌ Erro ao atualizar créditos:', updateError);
        return false;
      }

      console.log('✅ Créditos consumidos com sucesso. Saldo anterior:', user.creditos, 'Saldo atual:', newCredits);
      return true;
    } catch (error: any) {
      console.error('❌ Erro ao consumir créditos por email:', error);
      return false;
    } finally {
      setLoading(false);
    }
  };

  return {
    getCreditsbyEmail,
    addCredits,
    consumeCredits,
    consumeCreditsByEmail,
    loading
  };
};
