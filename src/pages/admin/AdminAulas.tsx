
import { AdminLayout } from "@/components/admin/AdminLayout";
import { SimpleAulaList } from "@/components/admin/SimpleAulaList";

const AdminAulas = () => {
  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Gerenciar Aulas</h2>
          <p className="text-gray-600">Crie e gerencie aulas e conteúdos</p>
        </div>

        <SimpleAulaList />
      </div>
    </AdminLayout>
  );
};

export default AdminAulas;
