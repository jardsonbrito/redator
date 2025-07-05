
import { useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { TurmaSelector } from "@/components/admin/TurmaSelector";
import { CreditManager } from "@/components/admin/CreditManager";
import { BackButton } from "@/components/admin/BackButton";

const AdminCreditos = () => {
  const [selectedTurma, setSelectedTurma] = useState<string | null>(null);

  const handleTurmaSelect = (turma: string) => {
    setSelectedTurma(turma);
  };

  const handleBack = () => {
    setSelectedTurma(null);
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {!selectedTurma ? (
          <>
            <BackButton />
            <TurmaSelector onTurmaSelect={handleTurmaSelect} />
          </>
        ) : (
          <div className="space-y-4">
            <BackButton />
            <div className="flex items-center gap-4 mb-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Créditos - {selectedTurma}</h2>
                <p className="text-gray-600">Gerencie os créditos dos alunos desta turma</p>
              </div>
            </div>
            
            <CreditManager turmaFilter={selectedTurma} />
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminCreditos;
