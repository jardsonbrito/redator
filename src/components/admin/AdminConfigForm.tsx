import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAdminConfig } from '@/hooks/useAdminConfig';
import { AppSettingsForm } from './AppSettingsForm';
import { CreditManagement } from './CreditManagement';
import { SubscriptionManagement } from './SubscriptionManagement';
import { SimpleSubscriptionTest } from './SimpleSubscriptionTest';
import { SubscriptionTestBasic } from './SubscriptionTestBasic';
import { DirectSubscriptionTest } from './DirectSubscriptionTest';
import { SubscriptionManagementSimple } from './SubscriptionManagementSimple';
import { SubscriptionManagementClean } from './SubscriptionManagementClean';
import { SubscriptionDebugger } from './SubscriptionDebugger';
import { Mail, Key, User, Clock, AlertTriangle, Settings, CreditCard, Crown } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface AdminUser {
  id: string;
  email: string;
  nome_completo: string;
  ativo: boolean;
  criado_em: string;
  ultimo_login?: string;
}

export const AdminConfigForm = () => {
  console.log('🔧 AdminConfigForm rendered');

  // MODO DEBUG: Desabilitado após testes
  const isDebugMode = false;
  if (isDebugMode) {
    console.log('🚨 MODO DEBUG: Retornando componente de teste direto');
    return <DirectSubscriptionTest />;
  }

  const [currentAdmin, setCurrentAdmin] = useState<AdminUser | null>(null);
  const [loadingAdmin, setLoadingAdmin] = useState(true);
  
  // Estados para alteração de email
  const [newEmail, setNewEmail] = useState('');
  const [emailPassword, setEmailPassword] = useState('');
  
  // Estados para alteração de senha
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const { loading, getCurrentAdmin, updateAdminEmail, updateAdminPassword } = useAdminConfig();

  useEffect(() => {
    loadCurrentAdmin();
  }, []);

  const loadCurrentAdmin = async () => {
    setLoadingAdmin(true);
    try {
      const admin = await getCurrentAdmin();
      setCurrentAdmin(admin);
      if (admin) {
        setNewEmail(admin.email);
      }
    } catch (error) {
      console.error('Erro ao carregar admin:', error);
    } finally {
      setLoadingAdmin(false);
    }
  };

  const handleUpdateEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentAdmin || !newEmail || !emailPassword) return;

    if (newEmail === currentAdmin.email) {
      return;
    }

    const success = await updateAdminEmail(
      currentAdmin.id,
      newEmail,
      emailPassword
    );

    if (success) {
      setEmailPassword('');
      // Recarregar dados do admin
      await loadCurrentAdmin();
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentAdmin || !currentPassword || !newPassword || !confirmPassword) return;

    if (newPassword !== confirmPassword) {
      return;
    }

    if (newPassword.length < 6) {
      return;
    }

    const success = await updateAdminPassword(
      currentAdmin.id,
      currentPassword,
      newPassword
    );

    if (success) {
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    }
  };

  if (loadingAdmin) {
    return (
      <div className="space-y-6">
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Carregando configurações...</p>
        </div>
      </div>
    );
  }

  if (!currentAdmin) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          Erro ao carregar dados do administrador. Verifique se você tem permissões adequadas.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <Tabs defaultValue="account" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="account" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            Conta
          </TabsTrigger>
          <TabsTrigger value="submissions" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Envios
          </TabsTrigger>
          <TabsTrigger value="credits" className="flex items-center gap-2">
            <CreditCard className="h-4 w-4" />
            Créditos
          </TabsTrigger>
          <TabsTrigger value="subscriptions" className="flex items-center gap-2">
            <Crown className="h-4 w-4" />
            Assinatura
          </TabsTrigger>
        </TabsList>

        <TabsContent value="account" className="space-y-6">
          {/* Informações do Admin */}
          <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Informações do Administrador
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-sm font-medium text-muted-foreground">Nome Completo</Label>
              <p className="text-sm">{currentAdmin.nome_completo}</p>
            </div>
            <div>
              <Label className="text-sm font-medium text-muted-foreground">Email Atual</Label>
              <p className="text-sm">{currentAdmin.email}</p>
            </div>
            <div>
              <Label className="text-sm font-medium text-muted-foreground">Status</Label>
              <p className="text-sm">
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-100 text-green-800">
                  Ativo
                </span>
              </p>
            </div>
            <div>
              <Label className="text-sm font-medium text-muted-foreground">Último Login</Label>
              <p className="text-sm flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {currentAdmin.ultimo_login ? 
                  new Date(currentAdmin.ultimo_login).toLocaleString('pt-BR') : 
                  'Nunca'
                }
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Alterar Email */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Alterar Email
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleUpdateEmail} className="space-y-4">
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>Atenção:</strong> Alterar o email pode invalidar sua sessão atual. 
                Você precisará fazer login novamente com o novo email.
              </AlertDescription>
            </Alert>

            <div>
              <Label htmlFor="newEmail">Novo Email</Label>
              <Input
                id="newEmail"
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="Digite o novo email"
                required
              />
            </div>

            <div>
              <Label htmlFor="emailPassword">Senha Atual (para confirmação)</Label>
              <Input
                id="emailPassword"
                type="password"
                value={emailPassword}
                onChange={(e) => setEmailPassword(e.target.value)}
                placeholder="Digite sua senha atual"
                required
              />
            </div>

            <Button 
              type="submit" 
              disabled={loading || !newEmail || !emailPassword || newEmail === currentAdmin.email}
            >
              {loading ? 'Alterando...' : 'Alterar Email'}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Separator />

      {/* Alterar Senha */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            Alterar Senha
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleUpdatePassword} className="space-y-4">
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>Atenção:</strong> Alterar a senha invalidará sua sessão atual. 
                Você precisará fazer login novamente com a nova senha.
              </AlertDescription>
            </Alert>

            <div>
              <Label htmlFor="currentPassword">Senha Atual</Label>
              <Input
                id="currentPassword"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Digite sua senha atual"
                required
              />
            </div>

            <div>
              <Label htmlFor="newPassword">Nova Senha</Label>
              <Input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Digite a nova senha (mín. 6 caracteres)"
                minLength={6}
                required
              />
            </div>

            <div>
              <Label htmlFor="confirmPassword">Confirmar Nova Senha</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirme a nova senha"
                required
              />
              {newPassword && confirmPassword && newPassword !== confirmPassword && (
                <p className="text-sm text-red-600 mt-1">As senhas não coincidem</p>
              )}
            </div>

            <Button 
              type="submit" 
              disabled={
                loading || 
                !currentPassword || 
                !newPassword || 
                !confirmPassword || 
                newPassword !== confirmPassword ||
                newPassword.length < 6
              }
            >
              {loading ? 'Alterando...' : 'Alterar Senha'}
            </Button>
          </form>
        </CardContent>
      </Card>
        </TabsContent>

        <TabsContent value="submissions">
          <AppSettingsForm />
        </TabsContent>

        <TabsContent value="credits">
          <CreditManagement />
        </TabsContent>

        <TabsContent value="subscriptions">
          <div className="space-y-6">
            <SubscriptionDebugger />
            <SubscriptionManagementClean />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};