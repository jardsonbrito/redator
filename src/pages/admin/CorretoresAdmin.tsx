
import { AdminLayout } from "@/components/admin/AdminLayout";
import { CorretorForm } from "@/components/admin/CorretorForm";
import { CorretorList } from "@/components/admin/CorretorList";
import { BackButton } from "@/components/admin/BackButton";
import { useState } from "react";

export const CorretoresAdmin = () => {
  const [refresh, setRefresh] = useState(false);
  const [corretorEditando, setCorretorEditando] = useState(null);

  const handleSuccess = () => {
    setRefresh(prev => !prev);
    setCorretorEditando(null);
  };

  const handleEdit = (corretor: any) => {
    setCorretorEditando(corretor);
  };

  const handleCancelEdit = () => {
    setCorretorEditando(null);
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <BackButton />
        
        <div>
          <h1 className="text-3xl font-bold">Gerenciar Corretores</h1>
          <p className="text-gray-600">Gerencie corretores e visualize estatísticas de correção</p>
        </div>
        
        <CorretorForm 
          onSuccess={handleSuccess} 
          corretorEditando={corretorEditando}
          onCancelEdit={handleCancelEdit}
        />
        <CorretorList 
          refresh={refresh} 
          onEdit={handleEdit}
        />
      </div>
    </AdminLayout>
  );
};
