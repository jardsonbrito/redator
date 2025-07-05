
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
      console.log('💳 INÍCIO - Adicionando créditos por email:', { userEmail, amount });
      
      const normalizedEmail = userEmail.trim().toLowerCase();
      
      // 1. Buscar o usuário pelo email primeiro
      console.log('🔍 PASSO 1 - Buscando usuário por email:', normalizedEmail);
      const { data: user, error: userError } = await supabase
        .from('profiles')
        .select('id, creditos, nome, email, user_type')
        .ilike('email', normalizedEmail)
        .eq('user_type', 'aluno')
        .maybeSingle();

      if (userError) {
        console.error('❌ ERRO PASSO 1 - Erro ao buscar usuário:', userError);
        toast({
          title: "Erro ao buscar usuário",
          description: userError.message,
          variant: "destructive"
        });
        return false;
      }

      if (!user) {
        console.error('❌ ERRO PASSO 1 - Usuário não encontrado para email:', normalizedEmail);
        toast({
          title: "Usuário não encontrado",
          description: `Nenhum aluno encontrado com o email: ${normalizedEmail}`,
          variant: "destructive"
        });
        return false;
      }

      console.log('✅ PASSO 1 SUCESSO - Usuário encontrado:', user);

      const currentCredits = user.creditos || 0;
      const newCredits = Math.max(0, currentCredits + amount);
      
      console.log('🔄 PASSO 2 - Calculando novos créditos:', {
        usuarioId: user.id,
        creditosAtuais: currentCredits,
        valorAdicionado: amount,
        novoTotal: newCredits
      });

      // 2. Usar transação para garantir consistência
      console.log('🚀 PASSO 3 - Executando UPDATE...');
      const { data: updateResult, error: updateError } = await supabase
        .from('profiles')
        .update({ 
          creditos: newCredits,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id)
        .select('creditos, nome, email, id');

      if (updateError) {
        console.error('❌ ERRO PASSO 3 - Erro ao atualizar créditos:', updateError);
        toast({
          title: "Erro ao atualizar créditos",
          description: updateError.message,
          variant: "destructive"
        });
        return false;
      }

      if (!updateResult || updateResult.length === 0) {
        console.error('❌ ERRO PASSO 3 - Nenhum registro foi atualizado');
        toast({
          title: "Erro na atualização",
          description: "Nenhum registro foi modificado. Verifique as permissões.",
          variant: "destructive"
        });
        return false;
      }

      console.log('✅ PASSO 3 SUCESSO - Créditos atualizados:', updateResult[0]);

      // 3. NOVA VERIFICAÇÃO TRIPLA - Aguardar e verificar se foi persistido
      console.log('🔍 PASSO 4 - Verificação de persistência...');
      await new Promise(resolve => setTimeout(resolve, 1000)); // Aguardar 1 segundo

      const { data: verification, error: verificationError } = await supabase
        .from('profiles')
        .select('creditos, email')
        .eq('id', user.id)
        .single();

      if (verificationError) {
        console.error('❌ ERRO PASSO 4 - Erro na verificação:', verificationError);
        toast({
          title: "Erro na verificação",
          description: "Não foi possível verificar se os créditos foram salvos.",
          variant: "destructive"
        });
        return false;
      }

      console.log('🔍 PASSO 4 RESULTADO - Dados após verificação:', verification);

      if (verification && verification.creditos === newCredits) {
        console.log('✅ PASSO 4 SUCESSO - Créditos persistidos corretamente!');
        toast({
          title: "Créditos atualizados com sucesso!",
          description: `${amount > 0 ? 'Adicionados' : 'Removidos'} ${Math.abs(amount)} créditos para ${user.nome}. Total atual: ${newCredits} créditos.`
        });
        return true;
      } else {
        console.error('❌ PASSO 4 FALHA - Créditos não foram persistidos!', {
          esperado: newCredits,
          encontrado: verification?.creditos
        });
        toast({
          title: "⚠️ FALHA CRÍTICA NA PERSISTÊNCIA",
          description: `Créditos não foram salvos no banco. Esperado: ${newCredits}, Encontrado: ${verification?.creditos}`,
          variant: "destructive"
        });
        return false;
      }

    } catch (error: any) {
      console.error('💥 ERRO GERAL - Erro ao gerenciar créditos:', error);
      toast({
        title: "Erro inesperado",
        description: error.message || "Ocorreu um erro ao atualizar os créditos.",
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

  const consumeCreditsByEmail = async (email: string, amount: number): Promise<boolean> => {
    setLoading(true);
    try {
      console.log('🔥 INÍCIO - Consumindo créditos por email:', { email, amount });
      
      const normalizedEmail = email.trim().toLowerCase();
      
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

      console.log('👤 Usuário encontrado:', user);

      // Verificar se tem créditos suficientes
      if ((user.creditos || 0) < amount) {
        console.error('❌ Créditos insuficientes:', user.creditos, 'necessários:', amount);
        return false;
      }

      // Consumir créditos usando a mesma lógica robusta do addCredits
      const success = await addCredits(email, -amount);
      
      if (success) {
        console.log('✅ Créditos consumidos com sucesso via addCredits');
        return true;
      } else {
        console.error('❌ Falha ao consumir créditos via addCredits');
        return false;
      }
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
