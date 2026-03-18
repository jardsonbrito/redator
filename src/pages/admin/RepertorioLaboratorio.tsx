import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { LaboratorioForm } from '@/components/admin/LaboratorioForm';
import { LaboratorioTable } from '@/components/admin/LaboratorioTable';
import { LaboratorioAula } from '@/hooks/useRepertorioLaboratorio';
import { ArrowLeft, Plus } from 'lucide-react';

const RepertorioLaboratorio = () => {
  const navigate = useNavigate();
  const [formOpen, setFormOpen] = useState(false);
  const [aulaParaEditar, setAulaParaEditar] = useState<LaboratorioAula | null>(null);

  const handleNovaAula = () => {
    setAulaParaEditar(null);
    setFormOpen(true);
  };

  const handleEditar = (aula: LaboratorioAula) => {
    setAulaParaEditar(aula);
    setTimeout(() => setFormOpen(true), 100);
  };

  const handleCloseForm = (open: boolean) => {
    setFormOpen(open);
    if (!open) setAulaParaEditar(null);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => navigate('/admin')} className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Voltar ao Dashboard
            </Button>
            <div className="h-6 w-px bg-gray-300" />
            <div className="flex items-center gap-2">
              <img
                src="/lovable-uploads/f86e5092-80dc-4e06-bb6a-f4cec6ee1b5b.png"
                alt=""
                className="h-7 w-7 rounded-lg"
              />
              <h1 className="text-lg font-semibold text-gray-900">Laboratório de Repertório</h1>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Título e ação */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Aulas cadastradas</h2>
            <p className="text-sm text-gray-500 mt-1">
              Cada aula percorre 3 etapas: Contexto → Repertório → Aplicação.
            </p>
          </div>
          <Button onClick={handleNovaAula} className="gap-2">
            <Plus className="h-4 w-4" />
            Nova aula
          </Button>
        </div>

        {/* Tabela de aulas */}
        <LaboratorioTable onEditar={handleEditar} onNova={handleNovaAula} />
      </main>

      {/* Formulário de criação/edição */}
      <LaboratorioForm
        open={formOpen}
        onOpenChange={handleCloseForm}
        aulaParaEditar={aulaParaEditar}
      />
    </div>
  );
};

export default RepertorioLaboratorio;
