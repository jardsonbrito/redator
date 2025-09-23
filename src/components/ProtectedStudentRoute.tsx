import { ReactNode } from 'react';
import { ProtectedRoute } from './ProtectedRoute';
import { ExpiredSubscriptionModal } from './student/ExpiredSubscriptionModal';
import { useSubscriptionGuard } from '@/hooks/useSubscriptionGuard';
import { useStudentAuth } from '@/hooks/useStudentAuth';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, MessageCircle } from 'lucide-react';

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

  const handleWhatsAppClick = () => {
    const whatsappUrl = 'https://wa.me/5585992160605?text=Quero%20renovar%20minha%20assinatura';
    window.open(whatsappUrl, '_blank');
  };

  if (!studentData) {
    return <ProtectedRoute>{children}</ProtectedRoute>;
  }

  // Se a assinatura está vencida, bloquear acesso
  if (isBlocked) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
          <Card className="max-w-md w-full">
            <CardContent className="p-6 text-center space-y-6">
              <AlertTriangle className="h-12 w-12 text-red-600 mx-auto" />
              <h2 className="text-xl font-semibold">Acesso Bloqueado</h2>
              <div className="space-y-3">
                <p className="text-muted-foreground leading-relaxed">
                  Sua assinatura expirou, por isso você não consegue acessar a plataforma.
                </p>
                <p className="text-sm text-muted-foreground">
                  Entre em contato com o administrador para renovar sua assinatura.
                </p>
              </div>

              <Button
                onClick={handleWhatsAppClick}
                className="w-full bg-green-600 hover:bg-green-700 text-white mt-4"
                size="lg"
              >
                <MessageCircle className="h-4 w-4 mr-2" />
                Falar no WhatsApp
              </Button>
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