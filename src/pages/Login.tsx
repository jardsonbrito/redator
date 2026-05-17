
import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Mail, Lock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { signIn, user, isAdmin, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (!authLoading && user && isAdmin) {
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

    try {
      const { error } = await signIn(email, password);

      if (error) {
        toast({
          title: "Erro no login",
          description: error.message || "Credenciais inválidas. Verifique email e senha.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Login realizado com sucesso!",
          description: "Redirecionando para o painel administrativo...",
        });
        setTimeout(() => {
          navigate('/admin', { replace: true });
        }, 1000);
      }
    } catch (error: any) {
      toast({
        title: "Erro inesperado",
        description: "Ocorreu um erro inesperado. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen overflow-hidden bg-gradient-to-br from-violet-50 via-white to-cyan-50 flex items-center justify-center">
        <div className="text-lg text-violet-600">Carregando...</div>
      </div>
    );
  }

  if (user && isAdmin) {
    return (
      <div className="min-h-screen overflow-hidden bg-gradient-to-br from-violet-50 via-white to-cyan-50 flex items-center justify-center">
        <div className="text-lg text-violet-600">Redirecionando para o painel administrativo...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen overflow-hidden bg-gradient-to-br from-violet-50 via-white to-cyan-50 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-[420px]">
        <div className="rounded-[2rem] border border-violet-100 bg-white/85 p-6 shadow-2xl shadow-violet-200/40 backdrop-blur xl:p-8">

          {/* Logo + título */}
          <div className="flex flex-col items-center mb-6">
            <img
              src="/lovable-uploads/f86e5092-80dc-4e06-bb6a-f4cec6ee1b5b.png"
              alt="Logo da plataforma"
              className="w-20 h-20 object-contain mb-3"
            />
            <h2 className="text-xl font-bold text-slate-900">Painel Administrativo</h2>
            <p className="mt-1 text-sm text-slate-500 text-center">
              Acesso exclusivo para administradores
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="email" className="text-sm font-medium text-slate-700">E-mail</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Digite seu e-mail"
                  required
                  className="pl-10 border-slate-200 focus:border-violet-400 focus:ring-violet-400/20"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="password" className="text-sm font-medium text-slate-700">Senha</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Digite sua senha"
                  required
                  className="pl-10 border-slate-200 focus:border-violet-400 focus:ring-violet-400/20"
                />
              </div>
            </div>

            <Button
              type="submit"
              className="w-full bg-violet-600 hover:bg-violet-700 text-white rounded-xl h-11 font-semibold mt-2"
              disabled={loading}
            >
              {loading ? 'Entrando...' : 'Acessar Painel Admin'}
            </Button>
          </form>

          <div className="mt-5 text-center">
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 text-sm text-violet-600 hover:text-violet-800 hover:underline transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Voltar ao início
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
