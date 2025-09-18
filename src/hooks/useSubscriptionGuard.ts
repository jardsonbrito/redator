import { useState, useEffect } from 'react';
import { useSubscription } from './useSubscription';

interface SubscriptionGuardResult {
  isBlocked: boolean;
  shouldShowModal: boolean;
  subscription: any;
  dismissModal: () => void;
}

export const useSubscriptionGuard = (userEmail: string): SubscriptionGuardResult => {
  const [shouldShowModal, setShouldShowModal] = useState(false);
  const { data: subscription, isLoading } = useSubscription(userEmail);

  useEffect(() => {
    if (!isLoading && subscription && subscription.status === 'Vencido') {
      setShouldShowModal(true);
    }
  }, [isLoading, subscription]);

  const dismissModal = () => {
    setShouldShowModal(false);
  };

  const isBlocked = subscription?.status === 'Vencido';

  return {
    isBlocked,
    shouldShowModal,
    subscription,
    dismissModal
  };
};