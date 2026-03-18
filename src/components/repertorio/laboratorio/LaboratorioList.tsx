import { useRepertorioLaboratorio } from '@/hooks/useRepertorioLaboratorio';
import { LaboratorioAulaCard } from './LaboratorioAulaCard';
import { Skeleton } from '@/components/ui/skeleton';

export function LaboratorioList() {
  const { aulas, isLoading } = useRepertorioLaboratorio();

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="space-y-3">
            <Skeleton className="aspect-square w-full rounded-xl" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-5/6" />
          </div>
        ))}
      </div>
    );
  }

  if (aulas.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
        <img
          src="/lovable-uploads/f86e5092-80dc-4e06-bb6a-f4cec6ee1b5b.png"
          alt=""
          className="w-14 h-14 rounded-xl opacity-70"
        />
        <div className="space-y-1">
          <p className="font-medium text-gray-700">Nenhuma aula disponível</p>
          <p className="text-sm text-gray-400">
            As aulas do Laboratório serão adicionadas em breve.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Cabeçalho da aba */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900">
          Laboratório de Repertório
        </h2>
        <p className="text-sm text-gray-500 mt-1">
          Aprenda a transformar repertório em argumento com aulas guiadas em 3 etapas.
        </p>
      </div>

      {/* Grade de cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        {aulas.map((aula) => (
          <LaboratorioAulaCard key={aula.id} aula={aula} />
        ))}
      </div>
    </div>
  );
}
