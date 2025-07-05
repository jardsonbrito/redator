
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
        .ilike('email', normalizedEmail)
        .eq('user_type', 'aluno')
        .maybeSingle();

      if (error) {
        console.error('❌ Erro ao buscar créditos:', error);
        return 0;
      }

      if (!data) {
        console.log('❌ Nenhum perfil de aluno encontrado para:', normalizedEmail);
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

  const addCredits = async (userEmail: string, amount: number): Promise<boolean> => {
    setLoading(true);
    try {
      console.log('💳 Adicionando créditos por email:', { userEmail, amount });
      
      const normalizedEmail = userEmail.trim().toLowerCase();
      
      // Buscar o usuário pelo email
      const { data: user, error: userError } = await supabase
        .from('profiles')
        .select('id, creditos, nome, email')
        .ilike('email', normalizedEmail)
        .eq('user_type', 'aluno')
        .maybeSingle();

      if (userError) {
        console.error('❌ Erro ao buscar usuário:', userError);
        return false;
      }

      if (!user) {
        console.error('❌ Usuário não encontrado para email:', normalizedEmail);
        return false;
      }

      const newCredits = Math.max(0, (user.creditos || 0) + amount);
      
      // Atualizar créditos diretamente no banco
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ creditos: newCredits })
        .eq('id', user.id);

      if (updateError) {
        console.error('❌ Erro ao atualizar créditos:', updateError);
        throw updateError;
      }

      toast({
        title: "Créditos atualizados",
        description: `${amount > 0 ? 'Adicionados' : 'Removidos'} ${Math.abs(amount)} créditos para ${user.nome}. Total: ${newCredits} créditos.`
      });

      console.log('✅ Créditos atualizados com sucesso. Novo saldo:', newCredits);
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

  // Função corrigida para consumir créditos por email
  const consumeCreditsByEmail = async (email: string, amount: number): Promise<boolean> => {
    setLoading(true);
    try {
      console.log('🔥 Consumindo créditos por email:', { email, amount });
      
      // Normalizar o email
      const normalizedEmail = email.trim().toLowerCase();
      
      // Buscar o usuário pelo email usando ilike para busca case-insensitive
      const { data: user, error: userError } = await supabase
        .from('profiles')
        .select('id, creditos, nome, email')
        .ilike('email', normalizedEmail)
        .eq('user_type', 'aluno')
        .maybeSingle();

      if (userError) {
        console.error('❌ Erro ao buscar usuário:', userError);
        return false;
      }

      if (!user) {
        console.error('❌ Usuário não encontrado para email:', normalizedEmail);
        return false;
      }

      console.log('👤 Usuário encontrado:', user);

      // Verificar se tem créditos suficientes
      if ((user.creditos || 0) < amount) {
        console.error('❌ Créditos insuficientes:', user.creditos, 'necessários:', amount);
        return false;
      }

      // Consumir créditos diretamente no banco
      const newCredits = (user.creditos || 0) - amount;
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
