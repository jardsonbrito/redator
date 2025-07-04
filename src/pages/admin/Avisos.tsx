
import { useState } from "react";
import { AvisoForm } from "@/components/admin/AvisoForm";
import { AvisoList } from "@/components/admin/AvisoList";

export const Avisos = () => {
  const [refresh, setRefresh] = useState(false);
  const [avisoEditando, setAvisoEditando] = useState(null);

  const handleSuccess = () => {
    setRefresh(prev => !prev);
  };

  const handleEdit = (aviso: any) => {
    setAvisoEditando(aviso);
  };

  const handleCancelEdit = () => {
    setAvisoEditando(null);
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Gerenciar Avisos</h1>
      
      <AvisoForm 
        onSuccess={handleSuccess} 
        avisoEditando={avisoEditando}
        onCancelEdit={handleCancelEdit}
      />
      
      <AvisoList 
        refresh={refresh} 
        onEdit={handleEdit}
      />
    </div>
  );
};
