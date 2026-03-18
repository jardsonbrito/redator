import { useRepertorioLaboratorio } from '@/hooks/useRepertorioLaboratorio';
import { LaboratorioAulaCard } from './LaboratorioAulaCard';
import { Skeleton } from '@/components/ui/skeleton';
import { LaboratorioIcon } from '@/components/icons/LaboratorioIcon';

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
        <LaboratorioIcon className="w-14 h-14 opacity-40 text-purple-400" />
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
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
      {aulas.map((aula) => (
        <LaboratorioAulaCard key={aula.id} aula={aula} />
      ))}
    </div>
  );
}
