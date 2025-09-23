import React from 'react';
import { Lock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { usePlanFeatures } from '@/hooks/usePlanFeatures';
import { useStudentAuth } from '@/hooks/useStudentAuth';

interface FeatureGateProps {
  feature: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
  className?: string;
}

export const FeatureGate = ({
  feature,
  children,
  fallback,
  className = ''
}: FeatureGateProps) => {
  const { studentData } = useStudentAuth();
  const { isFeatureEnabled } = usePlanFeatures(studentData.emailUsuario || '');

  const isEnabled = isFeatureEnabled(feature);

  if (!isEnabled) {
    if (fallback) {
      return <>{fallback}</>;
    }

    // Estilo padrão para feature bloqueada
    return (
      <div className={`relative ${className}`}>
        <div className="opacity-60 pointer-events-none">
          {children}
        </div>
        <div className="absolute inset-0 flex items-center justify-center bg-black/10 rounded-lg">
          <div className="flex flex-col items-center gap-2 text-center p-4">
            <div className="bg-white/90 p-2 rounded-full">
              <Lock className="w-6 h-6 text-gray-600" />
            </div>
            <Badge variant="secondary" className="bg-white/90 text-gray-700">
              Indisponível
            </Badge>
          </div>
        </div>
      </div>
    );
  }

  return <div className={className}>{children}</div>;
};