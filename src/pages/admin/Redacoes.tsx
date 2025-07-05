
import { AdminLayout } from "@/components/admin/AdminLayout";
import { RedacaoList } from "@/components/admin/RedacaoList";
import { BackButton } from "@/components/admin/BackButton";

export const Redacoes = () => {
  return (
    <AdminLayout>
      <div className="space-y-6">
        <BackButton />
        <div>
          <h1 className="text-3xl font-bold">Gerenciar Redações</h1>
          <p className="text-gray-600">Visualize e gerencie todas as redações enviadas</p>
        </div>
        <RedacaoList />
      </div>
    </AdminLayout>
  );
};
