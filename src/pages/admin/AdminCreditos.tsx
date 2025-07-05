
import { useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { TurmaSelector } from "@/components/admin/TurmaSelector";
import { CreditManager } from "@/components/admin/CreditManager";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

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
          <TurmaSelector onTurmaSelect={handleTurmaSelect} />
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-4 mb-6">
              <Button
                variant="outline"
                onClick={handleBack}
                className="flex items-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Voltar
              </Button>
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
