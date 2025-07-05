
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { User, Users, UserCheck, GraduationCap, Lock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

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
            App do Redator
          </h1>
          <p className="text-redator-accent">
            Escolha como deseja acessar
          </p>
        </div>

        {/* Opções principais de login */}
        <div className="space-y-4">
          <Link to="/admin">
            <Button 
              variant="outline" 
              className="w-full h-16 text-left justify-start bg-white hover:bg-red-50 border-2 hover:border-red-200 transition-all"
            >
              <GraduationCap className="w-6 h-6 mr-4 text-red-600" />
              <div>
                <div className="font-semibold text-red-800">Sou Professor</div>
                <div className="text-sm text-red-600">Acessar painel administrativo</div>
              </div>
            </Button>
          </Link>

          <Link to="/aluno-login">
            <Button 
              variant="outline" 
              className="w-full h-16 text-left justify-start bg-white hover:bg-blue-50 border-2 hover:border-blue-200 transition-all"
            >
              <User className="w-6 h-6 mr-4 text-blue-600" />
              <div>
                <div className="font-semibold text-blue-800">Sou Aluno</div>
                <div className="text-sm text-blue-600">Acessar com e-mail de aluno</div>
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
                <div className="font-semibold text-purple-800">Sou Visitante</div>
                <div className="text-sm text-purple-600">Acesso para visitantes</div>
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
                <div className="font-semibold text-green-800">Sou Corretor</div>
                <div className="text-sm text-green-600">Acessar painel de correção</div>
              </div>
            </Button>
          </Link>
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
