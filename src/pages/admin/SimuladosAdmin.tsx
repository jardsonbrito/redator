
import { useState } from "react";
import { SimuladoForm } from "@/components/admin/SimuladoForm";
import SimuladoList from "@/components/admin/SimuladoList";

export const SimuladosAdmin = () => {
  const [refresh, setRefresh] = useState(0);

  const handleSuccess = () => {
    setRefresh(prev => prev + 1);
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Gerenciar Simulados</h1>
      
      <SimuladoForm onSuccess={handleSuccess} />
      <SimuladoList onSuccess={handleSuccess} />
    </div>
  );
};
