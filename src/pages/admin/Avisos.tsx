
import { AdminLayout } from "@/components/admin/AdminLayout";
import { AvisoForm } from "@/components/admin/AvisoForm";
import { AvisoList } from "@/components/admin/AvisoList";
import { BackButton } from "@/components/admin/BackButton";
import { useState } from "react";

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
    <AdminLayout>
      <div className="space-y-6">
        <BackButton />
        
        <div>
          <h1 className="text-3xl font-bold">Gerenciar Avisos</h1>
          <p className="text-gray-600">Crie e gerencie avisos para alunos e corretores</p>
        </div>
        
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
    </AdminLayout>
  );
};
