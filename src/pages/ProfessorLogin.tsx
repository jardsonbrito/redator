import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ProfessorLoginForm } from "@/components/login/ProfessorLoginForm";
import { useProfessorAuth } from "@/hooks/useProfessorAuth";
import { useToast } from "@/hooks/use-toast";
import { GraduationCap, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

export const ProfessorLogin = () => {
  const [loading, setLoading] = useState(false);
  const { loginAsProfessor, professor } = useProfessorAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Redirecionar se já estiver logado
  useEffect(() => {
    if (professor) {
      if (professor.primeiro_login) {
        navigate('/professor/trocar-senha');
      } else {
        navigate('/professor/dashboard');
      }
    }
  }, [professor, navigate]);

  const handleLogin = async (data: { email: string; senha: string }) => {
    setLoading(true);

    try {
      const result = await loginAsProfessor(data.email, data.senha);
      
      if (result.error) {
        toast({
          title: "Erro no login",
          description: result.error,
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Erro no login:', error);
      toast({
        title: "Erro",
        description: "Ocorreu um erro inesperado. Tente novamente.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-secondary/10 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <div className="flex justify-center">
            <div className="p-3 bg-primary/10 rounded-full">
              <GraduationCap className="w-8 h-8 text-primary" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-primary">Professor</h1>
          <p className="text-muted-foreground">
            App do Redator
          </p>
        </div>

        <Card className="border-primary/20 shadow-lg">
          <CardHeader className="text-center pb-4">
            <CardTitle className="text-primary">Entrar no Sistema</CardTitle>
          </CardHeader>
          <CardContent>
            <ProfessorLoginForm onLogin={handleLogin} loading={loading} />
          </CardContent>
        </Card>

        <div className="text-center">
          <Link to="/">
            <Button variant="ghost" className="text-muted-foreground">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar para página inicial
            </Button>
          </Link>
        </div>

        <div className="text-center text-sm text-muted-foreground">
          <p>
            Problemas para acessar? Entre em contato com o administrador.
          </p>
        </div>
      </div>
    </div>
  );
};