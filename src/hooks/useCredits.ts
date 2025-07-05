
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

      // Normalizar email - remover espaços e converter para minúsculo
      const normalizedEmail = email.trim().toLowerCase();
      console.log('📧 Email normalizado:', normalizedEmail);

      // Buscar na tabela profiles onde user_type = 'aluno' usando busca exata
      const { data, error } = await supabase
        .from('profiles')
        .select('creditos, nome, email, user_type')
        .eq('email', normalizedEmail)
        .eq('user_type', 'aluno')
        .maybeSingle();

      if (error) {
        console.error('❌ Erro ao buscar créditos:', error);
        return 0;
      }

      if (!data) {
        console.log('❌ Nenhum perfil de aluno encontrado para:', normalizedEmail);
        // Tentar busca case-insensitive como fallback
        const { data: fallbackData, error: fallbackError } = await supabase
          .from('profiles') 
          .select('creditos, nome, email, user_type')
          .ilike('email', normalizedEmail)
          .eq('user_type', 'aluno')
          .maybeSingle();

        if (fallbackError || !fallbackData) {
          console.log('❌ Fallback também não encontrou dados');
          return 0;
        }

        console.log('✅ Dados encontrados via fallback:', fallbackData);
        const credits = fallbackData?.creditos || 0;
        console.log('💰 Créditos retornados (fallback):', credits);
        return credits;
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

  // Função corrigida para consumir créditos por email com lógica mais robusta
  const consumeCreditsByEmail = async (email: string, amount: number): Promise<boolean> => {
    setLoading(true);
    try {
      console.log('🔥 Consumindo créditos por email:', { email, amount });
      
      // Normalizar o email
      const normalizedEmail = email.trim().toLowerCase();
      
      // Buscar o usuário pelo email usando busca exata primeiro
      let user = null;
      let userError = null;

      const { data: exactUser, error: exactError } = await supabase
        .from('profiles')
        .select('id, creditos, nome, email')
        .eq('email', normalizedEmail)
        .eq('user_type', 'aluno')
        .maybeSingle();

      if (exactError) {
        console.log('⚠️ Erro na busca exata, tentando ilike:', exactError);
      }

      if (exactUser) {
        user = exactUser;
      } else {
        // Fallback para busca case-insensitive
        const { data: fallbackUser, error: fallbackError } = await supabase
          .from('profiles')
          .select('id, creditos, nome, email')
          .ilike('email', normalizedEmail)
          .eq('user_type', 'aluno')
          .maybeSingle();

        if (fallbackError) {
          console.error('❌ Erro ao buscar usuário (fallback):', fallbackError);
          return false;
        }

        user = fallbackUser;
      }

      if (!user) {
        console.error('❌ Usuário não encontrado para email:', normalizedEmail);
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
        .update({ 
          creditos: newCredits,
          updated_at: new Date().toISOString()
        })
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
