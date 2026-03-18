import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { LaboratorioForm } from '@/components/admin/LaboratorioForm';
import { LaboratorioTable } from '@/components/admin/LaboratorioTable';
import { LaboratorioAula } from '@/hooks/useRepertorioLaboratorio';
import { Plus } from 'lucide-react';
import { Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbLink, BreadcrumbSeparator, BreadcrumbPage } from '@/components/ui/breadcrumb';

const RepertorioLaboratorio = () => {
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
      <header className="bg-white/90 backdrop-blur-sm shadow-lg border-b border-primary/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                <img src="/lovable-uploads/f86e5092-80dc-4e06-bb6a-f4cec6ee1b5b.png" alt="" className="h-6 w-6 rounded-sm" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-foreground leading-tight">Painel Administrativo</h1>
                <p className="text-xs text-muted-foreground">Sistema de Gestão</p>
              </div>
            </div>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-3">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink href="/admin" className="text-primary font-medium">Dashboard</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>Laboratório de Repertório</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
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
