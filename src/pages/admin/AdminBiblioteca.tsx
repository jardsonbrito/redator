
import { AdminLayout } from "@/components/admin/AdminLayout";
import { BibliotecaList } from "@/components/admin/BibliotecaList";
import { BibliotecaForm } from "@/components/admin/BibliotecaForm";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useState } from "react";

const AdminBiblioteca = () => {
  const [showForm, setShowForm] = useState(false);
  const [refreshBiblioteca, setRefreshBiblioteca] = useState(false);

  const handleCreate = () => {
    setShowForm(true);
  };

  const handleClose = () => {
    setShowForm(false);
    setRefreshBiblioteca(!refreshBiblioteca);
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Gerenciar Biblioteca</h2>
            <p className="text-gray-600">Crie e gerencie materiais de estudo</p>
          </div>
          
          <Button onClick={handleCreate} className="flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Novo Material
          </Button>
        </div>

        {showForm ? (
          <BibliotecaForm onClose={handleClose} />
        ) : (
          <BibliotecaList refresh={refreshBiblioteca} onEdit={() => {}} />
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminBiblioteca;
