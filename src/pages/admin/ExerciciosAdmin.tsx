
import { AdminLayout } from "@/components/admin/AdminLayout";
import { ExercicioForm } from "@/components/admin/ExercicioForm";
import { ExercicioList } from "@/components/admin/ExercicioList";
import { BackButton } from "@/components/admin/BackButton";
import { useState } from "react";

export const ExerciciosAdmin = () => {
  const [refresh, setRefresh] = useState(0);

  const handleSuccess = () => {
    setRefresh(prev => prev + 1);
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <BackButton />
        
        <div>
          <h1 className="text-3xl font-bold">Gerenciar Exercícios</h1>
          <p className="text-gray-600">Crie e gerencie exercícios para os alunos</p>
        </div>
        
        <ExercicioForm onSuccess={handleSuccess} />
        <ExercicioList />
      </div>
    </AdminLayout>
  );
};
