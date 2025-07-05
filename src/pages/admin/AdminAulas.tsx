
import { AdminLayout } from "@/components/admin/AdminLayout";
import { AulaList } from "@/components/admin/AulaList";
import { AulaForm } from "@/components/admin/AulaForm";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useState } from "react";

const AdminAulas = () => {
  const [showForm, setShowForm] = useState(false);
  const [refreshAulas, setRefreshAulas] = useState(false);

  const handleCreate = () => {
    setShowForm(true);
  };

  const handleClose = () => {
    setShowForm(false);
    setRefreshAulas(!refreshAulas);
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Gerenciar Aulas</h2>
            <p className="text-gray-600">Crie e gerencie aulas e conteúdos</p>
          </div>
          
          <Button onClick={handleCreate} className="flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Nova Aula
          </Button>
        </div>

        {showForm ? (
          <AulaForm onClose={handleClose} />
        ) : (
          <AulaList refresh={refreshAulas} onEdit={() => {}} />
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminAulas;
