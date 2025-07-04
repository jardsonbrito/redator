
import { useState } from "react";
import { CorretorForm } from "@/components/admin/CorretorForm";
import { CorretorList } from "@/components/admin/CorretorList";

export const CorretoresAdmin = () => {
  const [refresh, setRefresh] = useState(0);

  const handleSuccess = () => {
    setRefresh(prev => prev + 1);
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Gerenciar Corretores</h1>
      
      <CorretorForm onSuccess={handleSuccess} />
      <CorretorList refresh={refresh} onSuccess={handleSuccess} />
    </div>
  );
};
