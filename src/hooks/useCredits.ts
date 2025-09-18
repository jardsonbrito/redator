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
    console.log('📧 Tipo do email:', typeof userEmail);
    console.log('📧 Email é null/undefined?', userEmail == null);
    console.log('📧 Email é string vazia?', userEmail === '');
    
    if (!userEmail) {
      console.log('❌ Email não fornecido, parando aqui');
      console.log('📧 Valor exato do userEmail:', JSON.stringify(userEmail));
      setLoading(false);
      return;
    }

    const normalizedEmail = userEmail.toLowerCase().trim();
    console.log('📧 Email normalizado:', normalizedEmail);

    try {
      setLoading(true);
      console.log('🔄 Executando query no Supabase...');
      
      // TESTE ESPECÍFICO PARA ABÍLIO
      if (normalizedEmail === 'abilio.gomes@aluno.ce.gov.br') {
        console.log('🎯 TESTE ESPECÍFICO PARA ABÍLIO DETECTADO!');
        
        // Primeiro, vamos testar a função RPC
        const { data: rpcResult, error: rpcError } = await supabase
          .rpc('get_credits_by_email', { user_email: normalizedEmail });
        
        console.log('🎯 ABÍLIO - Resultado da função RPC:', { data: rpcResult, error: rpcError });
      }
      
      const { data, error, count } = await supabase
        .from('profiles')
        .select('creditos, id, nome, sobrenome, user_type, ativo, status_aprovacao', { count: 'exact' })
        .eq('email', normalizedEmail)
        .eq('user_type', 'aluno');

      console.log('📊 Resultado da query:', { data, error, count });
      
      if (error) {
        console.error('❌ Erro na query:', error);
        throw error;
      }

      if (!data || data.length === 0) {
        console.log('⚠️ Nenhum perfil encontrado para email:', normalizedEmail);
        console.log('🔍 Vamos buscar TODOS os perfis para debug...');
        
        // Debug: buscar todos os perfis para ver se o email existe
        const { data: allProfiles } = await supabase
          .from('profiles')
          .select('email, creditos, user_type, ativo, status_aprovacao')
          .limit(10);
        
        console.log('👥 Primeiros 10 perfis no banco:', allProfiles);
        
        setCredits(0);
        setError('Perfil não encontrado');
      } else {
        const profile = data[0];
        console.log('✅ Perfil encontrado:', profile);
        console.log('💰 Créditos no banco:', profile.creditos);
        
        const creditValue = profile.creditos || 0;
        setCredits(creditValue);
        setError(null);
        
        console.log('💰 Créditos definidos no estado:', creditValue);
      }
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
    console.log('📧 Email:', userEmail);
    console.log('💰 Quantidade a consumir:', amount);
    console.log('💰 Créditos atuais no estado:', credits);
    
    if (!userEmail) {
      console.log('❌ Email não encontrado');
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

      const newCredits = credits - amount;
      console.log('💰 Novos créditos calculados:', newCredits);

      // Buscar o ID do usuário
      const { data: userData, error: userError } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', userEmail.toLowerCase().trim())
        .eq('user_type', 'aluno')
        .single();

      if (userError) {
        console.error('❌ Erro ao buscar usuário:', userError);
        throw userError;
      }

      console.log('👤 ID do usuário encontrado:', userData.id);

      // Atualizar créditos
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ creditos: newCredits })
        .eq('id', userData.id);

      if (updateError) {
        console.error('❌ Erro ao atualizar créditos:', updateError);
        throw updateError;
      }

      console.log('✅ Créditos atualizados no banco');

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
        console.warn('⚠️ Erro ao registrar audit (não crítico):', auditError);
      }

      const oldCredits = credits;
      setCredits(newCredits);

      console.log('💰 Estado atualizado - Antigo:', oldCredits, 'Novo:', newCredits);

      // Mostrar notificação verde de sucesso com informações dos créditos
      toast({
        title: "✅ Redação Enviada!",
        description: `${amount} crédito(s) utilizado(s) • Saldo: ${newCredits}`,
        className: "border-green-200 bg-green-50 text-green-900",
        duration: 4000
      });

      return true;
    } catch (err) {
      console.error('💥 Erro ao consumir créditos:', err);
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
    await loadCredits();
  };

  useEffect(() => {
    console.log('🔄 useCredits useEffect disparado - userEmail:', userEmail);
    loadCredits();
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
