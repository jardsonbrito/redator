
import { AdminLayout } from "@/components/admin/AdminLayout";
import { RedacoesEnviadasList } from "@/components/admin/RedacoesEnviadasList";
import { useSearchParams } from "react-router-dom";

export const Redacoes = () => {
  const [searchParams] = useSearchParams();
  const status = searchParams.get('status');

  const getTitulo = () => {
    if (status === 'pendentes') return 'Redações Pendentes de Correção';
    if (status === 'corrigidas') return 'Redações Corrigidas';
    return 'Todas as Redações Enviadas';
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Gerenciar Redações</h1>
          <p className="text-gray-600">Visualize e gerencie todas as redações enviadas por alunos</p>
        </div>
        <RedacoesEnviadasList 
          filtroStatus={status || undefined} 
          titulo={getTitulo()}
        />
      </div>
    </AdminLayout>
  );
};
