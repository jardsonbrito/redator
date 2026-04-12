import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
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
import { RedacaoComentadaList } from '@/components/admin/redacoes-comentadas/RedacaoComentadaList';
import { RedacaoComentadaForm } from '@/components/admin/redacoes-comentadas/RedacaoComentadaForm';

const RedacoesComentadasAdmin = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [view, setView] = useState<'list' | 'form'>('list');
  const [editingId, setEditingId] = useState<string | null>(null);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    signOut();
    navigate('/login', { replace: true });
  };

  const handleNova = () => {
    setEditingId(null);
    setView('form');
  };

  const handleEdit = (id: string) => {
    setEditingId(id);
    setView('form');
  };

  const handleSuccess = () => {
    setView('list');
    setEditingId(null);
  };

  const handleCancel = () => {
    setView('list');
    setEditingId(null);
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
              <BreadcrumbPage className="text-foreground">Redações Comentadas</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        {view === 'form' ? (
          <RedacaoComentadaForm
            editingId={editingId}
            onSuccess={handleSuccess}
            onCancel={handleCancel}
          />
        ) : (
          <>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
              <div>
                <h1 className="text-3xl font-bold text-foreground">Redações Comentadas</h1>
                <p className="text-muted-foreground mt-1">
                  Gerencie redações com comentários detalhados e anotações por trecho.
                </p>
              </div>
              <Button onClick={handleNova} className="gap-2 w-full sm:w-auto">
                <Plus className="h-4 w-4" />
                Nova Redação Comentada
              </Button>
            </div>

            <RedacaoComentadaList onEdit={handleEdit} />
          </>
        )}
      </main>
    </div>
  );
};

export default RedacoesComentadasAdmin;
