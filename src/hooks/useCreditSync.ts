import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';

/**
 * Hook para sincronizar atualizações de créditos e invalidar caches relevantes
 */
export const useCreditSync = () => {
  const queryClient = useQueryClient();

  const syncCreditsUpdate = useCallback(async (userEmail: string, newCredits: number, action: 'add' | 'subtract', amount: number) => {
    console.log('🔄 Sincronizando atualização de créditos...', {
      userEmail,
      newCredits,
      action,
      amount
    });

    // 1. Limpar localStorage de créditos forçados
    localStorage.removeItem('forced_credits_' + userEmail.toLowerCase().trim());

    // 2. Disparar evento personalizado para atualizar componentes
    window.dispatchEvent(new CustomEvent('credits-updated', {
      detail: {
        userEmail: userEmail.toLowerCase().trim(),
        newCredits,
        action,
        amount
      }
    }));

    // 3. Invalidar queries relacionadas a créditos e redações
    await queryClient.invalidateQueries({
      queryKey: ['minhas-redacoes']
    });

    await queryClient.invalidateQueries({
      queryKey: ['minhas-redacoes', userEmail.toLowerCase().trim()]
    });

    // 4. Invalidar queries de créditos se existirem
    await queryClient.invalidateQueries({
      queryKey: ['credits', userEmail.toLowerCase().trim()]
    });

    console.log('✅ Sincronização de créditos concluída');
  }, [queryClient]);

  return { syncCreditsUpdate };
};