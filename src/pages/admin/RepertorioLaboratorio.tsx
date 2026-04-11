import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { LaboratorioForm } from '@/components/admin/LaboratorioForm';
import { LaboratorioTable } from '@/components/admin/LaboratorioTable';
import { LaboratorioAula } from '@/hooks/useRepertorioLaboratorio';
import { Plus } from 'lucide-react';
import { Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbLink, BreadcrumbSeparator, BreadcrumbPage } from '@/components/ui/breadcrumb';
import { ModernAdminHeader } from '@/components/admin/ModernAdminHeader';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

const RepertorioLaboratorio = () => {
  const [formOpen, setFormOpen] = useState(false);
  const [aulaParaEditar, setAulaParaEditar] = useState<LaboratorioAula | null>(null);
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    signOut();
    navigate('/login', { replace: true });
  };

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
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <ModernAdminHeader userEmail={user?.email} onLogout={handleLogout} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumb */}
        <Breadcrumb className="mb-6">
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="/admin" className="text-primary font-medium">Dashboard</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage className="text-foreground">Laboratório de Repertório</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        {/* Título e ação */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold">Laboratório de Repertório</h1>
            <p className="text-sm text-muted-foreground mt-1">
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
