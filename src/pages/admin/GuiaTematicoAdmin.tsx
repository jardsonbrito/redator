import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { GuiaTematicoForm } from '@/components/admin/GuiaTematicoForm';
import { GuiaTematicoGrid } from '@/components/admin/GuiaTematicoGrid';
import { GuiaTematico } from '@/hooks/useGuiaTematico';
import { Plus } from 'lucide-react';
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbSeparator,
  BreadcrumbPage,
} from '@/components/ui/breadcrumb';

const GuiaTematicoAdmin = () => {
  const [formOpen, setFormOpen] = useState(false);
  const [guiaParaEditar, setGuiaParaEditar] = useState<GuiaTematico | null>(null);

  const handleNovoGuia = () => {
    setGuiaParaEditar(null);
    setFormOpen(true);
  };

  const handleEditar = (guia: GuiaTematico) => {
    setGuiaParaEditar(guia);
    setTimeout(() => setFormOpen(true), 100);
  };

  const handleCloseForm = (open: boolean) => {
    setFormOpen(open);
    if (!open) setGuiaParaEditar(null);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white/95 backdrop-blur-sm shadow-sm border-b border-gray-200/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-3">
            <img
              src="/lovable-uploads/f86e5092-80dc-4e06-bb6a-f4cec6ee1b5b.png"
              alt="Logo"
              className="w-8 h-8 object-contain"
            />
            <div>
              <h1 className="text-lg font-semibold text-gray-900 leading-tight">
                Painel Administrativo
              </h1>
              <p className="text-xs text-gray-500">Sistema de Gestão</p>
            </div>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-3">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink href="/admin" className="text-primary font-medium">
                  Dashboard
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>Guia Temático</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Título e ação */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Guias cadastrados</h2>
            <p className="text-sm text-gray-500 mt-1">
              Cada guia percorre 8 etapas de aprofundamento temático.
            </p>
          </div>
          <Button onClick={handleNovoGuia} className="gap-2">
            <Plus className="h-4 w-4" />
            Novo guia
          </Button>
        </div>

        <GuiaTematicoGrid onEditar={handleEditar} onNovo={handleNovoGuia} />
      </main>

      <GuiaTematicoForm
        open={formOpen}
        onOpenChange={handleCloseForm}
        guiaParaEditar={guiaParaEditar}
      />
    </div>
  );
};

export default GuiaTematicoAdmin;
