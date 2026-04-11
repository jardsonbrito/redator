import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
import { ModernAdminHeader } from '@/components/admin/ModernAdminHeader';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

const GuiaTematicoAdmin = () => {
  const [formOpen, setFormOpen] = useState(false);
  const [guiaParaEditar, setGuiaParaEditar] = useState<GuiaTematico | null>(null);
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    signOut();
    navigate('/login', { replace: true });
  };

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
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <ModernAdminHeader userEmail={user?.email} onLogout={handleLogout} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumb */}
        <Breadcrumb className="mb-6">
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="/admin" className="text-primary font-medium">
                Dashboard
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage className="text-foreground">Guia Temático</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        {/* Título e ação */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Guia Temático</h1>
            <p className="text-muted-foreground mt-1">
              Cada guia percorre 8 etapas de aprofundamento temático.
            </p>
          </div>
          <Button onClick={handleNovoGuia} className="gap-2 w-full sm:w-auto">
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
