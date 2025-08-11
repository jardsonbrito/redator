import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAdminManagement } from '@/hooks/useAdminManagement';
import { Eye, EyeOff, Loader2 } from 'lucide-react';

interface AdminFormProps {
  onSuccess?: () => void;
}

export const AdminForm = ({ onSuccess }: AdminFormProps) => {
  const [formData, setFormData] = useState({
    nome_completo: '',
    email: '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const { createAdmin, loading } = useAdminManagement();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.nome_completo.trim() || !formData.email.trim() || !formData.password.trim()) {
      return;
    }

    const success = await createAdmin(formData);
    if (success) {
      setFormData({ nome_completo: '', email: '', password: '' });
      onSuccess?.();
    }
  };

  const isFormValid = formData.nome_completo.trim() && 
                     formData.email.trim() && 
                     formData.password.trim().length >= 6;

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Cadastrar Novo Administrador</CardTitle>
        <CardDescription>
          Crie uma nova conta de administrador para o sistema
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <Alert>
          <AlertDescription>
            O novo administrador receberá uma senha temporária e deverá alterá-la no primeiro login.
          </AlertDescription>
        </Alert>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="nome_completo">Nome Completo</Label>
            <Input
              id="nome_completo"
              value={formData.nome_completo}
              onChange={(e) => setFormData(prev => ({ ...prev, nome_completo: e.target.value }))}
              placeholder="Digite o nome completo"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">E-mail</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
              placeholder="Digite o e-mail"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Senha Temporária</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={formData.password}
                onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                placeholder="Digite a senha temporária (mín. 6 caracteres)"
                minLength={6}
                required
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          <Button 
            type="submit" 
            disabled={!isFormValid || loading}
            className="w-full"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Criando...
              </>
            ) : (
              'Criar Administrador'
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};