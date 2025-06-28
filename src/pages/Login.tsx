
import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { signIn, user, isAdmin, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Redirect if already authenticated and admin
  useEffect(() => {
    console.log('Login page - Auth loading:', authLoading, 'User:', user?.email, 'IsAdmin:', isAdmin);
    
    if (!authLoading && user && isAdmin) {
      console.log('User is already authenticated as admin, redirecting to /admin');
      navigate('/admin', { replace: true });
    }
  }, [user, isAdmin, authLoading, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      toast({
        title: "Campos obrigatórios",
        description: "Por favor, preencha email e senha.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    console.log('Form submitted - attempting login with:', email);

    try {
      const { error } = await signIn(email, password);
      
      if (error) {
        console.error('Login error:', error);
        toast({
          title: "Erro no login",
          description: error.message || "Credenciais inválidas. Verifique email e senha.",
          variant: "destructive",
        });
      } else {
        console.log('Login successful, waiting for redirect...');
        toast({
          title: "Login realizado com sucesso!",
          description: "Redirecionando para o painel administrativo...",
        });
        
        // Give a moment for the auth state to update, then redirect
        setTimeout(() => {
          navigate('/admin', { replace: true });
        }, 1000);
      }
    } catch (error: any) {
      console.error('Unexpected login error:', error);
      toast({
        title: "Erro inesperado",
        description: "Ocorreu um erro inesperado. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Show loading if auth is still loading
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-lg">Carregando sistema de autenticação...</div>
      </div>
    );
  }

  // If already logged in as admin, show redirect message
  if (user && isAdmin) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-lg">Redirecionando para o painel administrativo...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
      <div className="w-full max-w-md p-4">
        <div className="mb-6">
          <Link to="/" className="flex items-center gap-2 text-blue-600 hover:text-blue-700 transition-colors">
            <ArrowLeft className="w-5 h-5" />
            <span>Voltar ao início</span>
          </Link>
        </div>
        
        <Card>
          <CardHeader>
            <CardTitle className="text-center">Painel Administrativo</CardTitle>
            <p className="text-center text-sm text-gray-600">
              Acesso exclusivo para administradores
            </p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Digite seu email"
                  required
                />
              </div>
              <div>
                <Label htmlFor="password">Senha</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Digite sua senha"
                  required
                />
              </div>
              
              <Button 
                type="submit" 
                className="w-full" 
                disabled={loading}
              >
                {loading ? 'Fazendo login...' : 'Acessar Painel Admin'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Login;
