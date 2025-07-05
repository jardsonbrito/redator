
import { useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { User, Users, UserCheck, Lock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

const Login = () => {
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [isAdminLoading, setIsAdminLoading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAdminLoading(true);
    
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: adminEmail,
        password: adminPassword,
      });

      if (error) throw error;

      if (data.user) {
        localStorage.setItem("userType", "admin");
        toast({
          title: "Login realizado com sucesso!",
          description: "Redirecionando para o painel administrativo...",
        });
        navigate("/admin");
      }
    } catch (error: any) {
      console.error("Erro no login do admin:", error);
      toast({
        title: "Erro no login",
        description: error.message || "Credenciais inválidas.",
        variant: "destructive",
      });
    } finally {
      setIsAdminLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-redator-primary/10 to-redator-accent/10 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Logo/Header */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-redator-primary">
            Laboratório do Redator
          </h1>
          <p className="text-redator-accent">
            Escolha como deseja acessar a plataforma
          </p>
        </div>

        {/* Opções principais de login */}
        <div className="space-y-4">
          <Link to="/aluno-login">
            <Button 
              variant="outline" 
              className="w-full h-16 text-left justify-start bg-white hover:bg-blue-50 border-2 hover:border-blue-200 transition-all"
            >
              <User className="w-6 h-6 mr-4 text-blue-600" />
              <div>
                <div className="font-semibold text-blue-800">Sou aluno</div>
                <div className="text-sm text-blue-600">Acessar com e-mail de aluno</div>
              </div>
            </Button>
          </Link>

          <Link to="/corretor-login">
            <Button 
              variant="outline" 
              className="w-full h-16 text-left justify-start bg-white hover:bg-green-50 border-2 hover:border-green-200 transition-all"
            >
              <UserCheck className="w-6 h-6 mr-4 text-green-600" />
              <div>
                <div className="font-semibold text-green-800">Sou corretor</div>
                <div className="text-sm text-green-600">Acessar painel de correção</div>
              </div>
            </Button>
          </Link>

          <Link to="/visitante-login">
            <Button 
              variant="outline" 
              className="w-full h-16 text-left justify-start bg-white hover:bg-purple-50 border-2 hover:border-purple-200 transition-all"
            >
              <Users className="w-6 h-6 mr-4 text-purple-600" />
              <div>
                <div className="font-semibold text-purple-800">Sou visitante</div>
                <div className="text-sm text-purple-600">Acesso para visitantes</div>
              </div>
            </Button>
          </Link>
        </div>

        {/* Acesso administrativo discreto */}
        <div className="pt-4">
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button 
                variant="ghost" 
                size="sm" 
                className="w-full text-gray-500 hover:text-gray-700 text-xs"
              >
                <Lock className="w-3 h-3 mr-2" />
                Acesso ao painel administrativo
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Lock className="w-5 h-5" />
                  Acesso Administrativo
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleAdminLogin} className="space-y-4">
                <div>
                  <Label htmlFor="admin-email">E-mail</Label>
                  <Input
                    id="admin-email"
                    type="email"
                    value={adminEmail}
                    onChange={(e) => setAdminEmail(e.target.value)}
                    placeholder="admin@laboratoriodoredator.com"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="admin-password">Senha</Label>
                  <Input
                    id="admin-password"
                    type="password"
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    placeholder="Digite sua senha"
                    required
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1"
                    onClick={() => setIsDialogOpen(false)}
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    disabled={isAdminLoading}
                    className="flex-1"
                  >
                    {isAdminLoading ? "Entrando..." : "Entrar"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Link para voltar */}
        <div className="text-center">
          <Link 
            to="/" 
            className="text-sm text-redator-accent hover:text-redator-primary transition-colors"
          >
            ← Voltar para página inicial
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Login;
