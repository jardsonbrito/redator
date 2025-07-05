
import { useState } from "react";
import { CorretorForm } from "@/components/admin/CorretorForm";
import { CorretorList } from "@/components/admin/CorretorList";

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
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Gerenciar Corretores</h1>
      
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
  );
};
