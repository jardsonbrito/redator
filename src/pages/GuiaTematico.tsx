import { Map } from 'lucide-react';
import { StudentHeader } from '@/components/StudentHeader';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { TooltipProvider } from '@/components/ui/tooltip';
import { GuiaTematicoCard } from '@/components/shared/GuiaTematicoCard';
import { useGuiaTematico } from '@/hooks/useGuiaTematico';
import { usePageTitle } from '@/hooks/useBreadcrumbs';
import { Skeleton } from '@/components/ui/skeleton';

export default function GuiaTematico() {
  usePageTitle('Guia Temático');

  const { guias, isLoading } = useGuiaTematico();

  return (
    <ProtectedRoute>
      <TooltipProvider>
        <div className="min-h-screen bg-gradient-to-br from-purple-50 to-violet-100">
          <StudentHeader pageTitle="Guia Temático" />

          <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {isLoading ? (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="space-y-3">
                    <Skeleton className="h-44 w-full rounded-xl" />
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-full" />
                    <Skeleton className="h-10 w-full rounded-lg" />
                  </div>
                ))}
              </div>
            ) : guias.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
                <Map className="w-14 h-14 opacity-30 text-purple-400" />
                <div className="space-y-1">
                  <p className="font-medium text-gray-700">Nenhum guia disponível ainda</p>
                  <p className="text-sm text-gray-400">
                    Os guias temáticos serão adicionados em breve.
                  </p>
                </div>
              </div>
            ) : (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {guias.map((guia) => (
                  <GuiaTematicoCard key={guia.id} guia={guia} />
                ))}
              </div>
            )}
          </main>
        </div>
      </TooltipProvider>
    </ProtectedRoute>
  );
}
