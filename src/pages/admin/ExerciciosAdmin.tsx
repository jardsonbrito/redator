
import { useState } from "react";
import { ExercicioForm } from "@/components/admin/ExercicioForm";
import { ExercicioList } from "@/components/admin/ExercicioList";

export const ExerciciosAdmin = () => {
  const [refresh, setRefresh] = useState(0);

  const handleSuccess = () => {
    setRefresh(prev => prev + 1);
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Gerenciar Exercícios</h1>
      
      <ExercicioForm onSuccess={handleSuccess} />
      <ExercicioList refresh={refresh} onSuccess={handleSuccess} />
    </div>
  );
};
