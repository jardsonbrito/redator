
import { useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { TurmaSelector } from "@/components/admin/TurmaSelector";
import { AlunoList } from "@/components/admin/AlunoList";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

const AdminAlunos = () => {
  const [selectedTurma, setSelectedTurma] = useState<string | null>(null);
  const [refreshAlunos, setRefreshAlunos] = useState(false);

  const handleTurmaSelect = (turma: string) => {
    setSelectedTurma(turma);
  };

  const handleBack = () => {
    setSelectedTurma(null);
  };

  const handleEditAluno = (aluno: any) => {
    console.log("Editando aluno:", aluno);
    // Implementar lógica de edição
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
                <h2 className="text-2xl font-bold text-gray-900">Alunos - {selectedTurma}</h2>
                <p className="text-gray-600">Gerencie os alunos desta turma</p>
              </div>
            </div>
            
            <AlunoList 
              refresh={refreshAlunos} 
              onEdit={handleEditAluno}
              turmaFilter={selectedTurma}
            />
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminAlunos;
