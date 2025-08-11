import { useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AdminUserCard } from './AdminUserCard';
import { useAdminManagement } from '@/hooks/useAdminManagement';
import { Loader2, RefreshCw, Shield } from 'lucide-react';

export const AdminList = () => {
  const { loading, admins, loadAdmins, toggleAdminStatus } = useAdminManagement();

  useEffect(() => {
    loadAdmins();
  }, []);

  const activeAdmins = admins.filter(admin => admin.ativo);
  const inactiveAdmins = admins.filter(admin => !admin.ativo);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Administradores do Sistema
              </CardTitle>
              <CardDescription>
                Gerencie os administradores que têm acesso ao sistema
              </CardDescription>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={loadAdmins}
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="mr-2 h-4 w-4" />
              )}
              Atualizar
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading && admins.length === 0 ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="h-8 w-8 animate-spin" />
              <span className="ml-2">Carregando administradores...</span>
            </div>
          ) : (
            <>
              {activeAdmins.length > 0 && (
                <div className="space-y-4">
                  <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
                    Administradores Ativos ({activeAdmins.length})
                  </h3>
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {activeAdmins.map((admin) => (
                      <AdminUserCard
                        key={admin.id}
                        admin={admin}
                        onToggleStatus={toggleAdminStatus}
                        loading={loading}
                      />
                    ))}
                  </div>
                </div>
              )}

              {inactiveAdmins.length > 0 && (
                <div className="space-y-4 mt-8">
                  <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
                    Administradores Inativos ({inactiveAdmins.length})
                  </h3>
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {inactiveAdmins.map((admin) => (
                      <AdminUserCard
                        key={admin.id}
                        admin={admin}
                        onToggleStatus={toggleAdminStatus}
                        loading={loading}
                      />
                    ))}
                  </div>
                </div>
              )}

              {admins.length === 0 && (
                <div className="text-center text-muted-foreground py-8">
                  Nenhum administrador encontrado.
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};