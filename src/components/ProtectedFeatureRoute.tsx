import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStudentAuth } from '@/hooks/useStudentAuth';
import { usePlanFeatures } from '@/hooks/usePlanFeatures';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Lock, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ProtectedFeatureRouteProps {
  children: React.ReactNode;
  feature: string;
  featureName: string;
}

export const ProtectedFeatureRoute = ({
  children,
  feature,
  featureName
}: ProtectedFeatureRouteProps) => {
  const { studentData } = useStudentAuth();
  const { isFeatureEnabled } = usePlanFeatures(studentData.email);
  const navigate = useNavigate();

  const isEnabled = isFeatureEnabled(feature);

  // Se a funcionalidade não está habilitada, mostrar bloqueio
  if (!isEnabled) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-violet-100 flex items-center justify-center">
        <div className="max-w-md mx-auto p-6">
          <Alert className="border-gray-300 bg-white">
            <Lock className="h-6 w-6 text-gray-500" />
            <AlertDescription className="ml-2">
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold text-gray-800 mb-2">
                    Funcionalidade Indisponível
                  </h3>
                  <p className="text-sm text-gray-600">
                    O acesso ao <strong>{featureName}</strong> não está disponível no seu plano atual ou foi temporariamente desabilitado.
                  </p>
                </div>

                <div className="flex justify-center">
                  <Button
                    variant="outline"
                    onClick={() => navigate('/student')}
                    className="flex items-center gap-2"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Voltar ao Dashboard
                  </Button>
                </div>
              </div>
            </AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};