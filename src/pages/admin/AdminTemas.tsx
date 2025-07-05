
import { AdminLayout } from "@/components/admin/AdminLayout";
import { TemaList } from "@/components/admin/TemaList";
import { TemaForm } from "@/components/admin/TemaForm";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useState } from "react";

const AdminTemas = () => {
  const [showForm, setShowForm] = useState(false);

  const handleCreate = () => {
    setShowForm(true);
  };

  const handleClose = () => {
    setShowForm(false);
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Gerenciar Temas</h2>
            <p className="text-gray-600">Crie e gerencie temas de redação</p>
          </div>
          
          <Button onClick={handleCreate} className="flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Novo Tema
          </Button>
        </div>

        {showForm ? (
          <TemaForm />
        ) : (
          <TemaList />
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminTemas;
