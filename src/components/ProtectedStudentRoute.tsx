import { ReactNode } from 'react';
import { ProtectedRoute } from './ProtectedRoute';
import { ExpiredSubscriptionModal } from './student/ExpiredSubscriptionModal';
import { useSubscriptionGuard } from '@/hooks/useSubscriptionGuard';
import { useStudentAuth } from '@/hooks/useStudentAuth';
import { Card, CardContent } from '@/components/ui/card';
import { AlertTriangle } from 'lucide-react';

interface ProtectedStudentRouteProps {
  children: ReactNode;
}

export const ProtectedStudentRoute = ({ children }: ProtectedStudentRouteProps) => {
  const { studentData } = useStudentAuth();
  const {
    isBlocked,
    shouldShowModal,
    subscription,
    dismissModal
  } = useSubscriptionGuard(studentData?.email || '');

  if (!studentData) {
    return <ProtectedRoute>{children}</ProtectedRoute>;
  }

  // Se a assinatura está vencida, bloquear acesso
  if (isBlocked) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
          <Card className="max-w-md w-full">
            <CardContent className="p-6 text-center space-y-4">
              <AlertTriangle className="h-12 w-12 text-red-600 mx-auto" />
              <h2 className="text-xl font-semibold">Acesso Bloqueado</h2>
              <p className="text-muted-foreground">
                Sua assinatura expirou. O acesso à plataforma foi bloqueado.
              </p>
              <p className="text-sm text-muted-foreground">
                Entre em contato com o administrador para renovar sua assinatura.
              </p>
            </CardContent>
          </Card>

          <ExpiredSubscriptionModal
            open={shouldShowModal}
            onOpenChange={(open) => !open && dismissModal()}
          />
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      {children}
      <ExpiredSubscriptionModal
        open={shouldShowModal}
        onOpenChange={(open) => !open && dismissModal()}
      />
    </ProtectedRoute>
  );
};