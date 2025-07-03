
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { User, ArrowLeft, Mail } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { useStudentAuth } from "@/hooks/useStudentAuth";
import { supabase } from "@/integrations/supabase/client";

const AlunoLogin = () => {
  const [emailDigitado, setEmailDigitado] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { loginAsStudent } = useStudentAuth();

  const handleLoginAluno = async () => {
    if (!emailDigitado.trim()) {
      toast({
        title: "Digite seu e-mail",
        description: "O e-mail é obrigatório para o login.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      // Verificar se o aluno existe na tabela profiles - SEM autenticação Supabase Auth
      const { data: aluno, error } = await supabase
        .from("profiles")
        .select("id, nome, email, turma")
        .eq("email", emailDigitado.toLowerCase().trim())
        .eq("user_type", "aluno")
        .maybeSingle();

      if (error) {
        throw error;
      }

      if (!aluno) {
        toast({
          title: "E-mail não encontrado",
          description: "Verifique se você foi cadastrado pelo professor.",
          variant: "destructive",
        });
        return;
      }

      // Login bem-sucedido - sem validação de senha ou autenticação Supabase Auth
      loginAsStudent(aluno.turma);
      
      toast({
        title: "Acesso liberado!",
        description: `Bem-vindo, ${aluno.nome}!`,
      });

      navigate("/app", { replace: true });

    } catch (error: any) {
      console.error("Erro no login:", error);
      toast({
        title: "Erro no login",
        description: "Ocorreu um erro ao verificar seus dados. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-violet-100 flex items-center justify-center">
      <div className="w-full max-w-md px-4">
        <div className="mb-6">
          <Link to="/" className="flex items-center gap-2 text-redator-primary hover:text-redator-accent transition-colors">
            <ArrowLeft className="w-5 h-5" />
            <span>Voltar ao início</span>
          </Link>
        </div>

        <div className="text-center mb-8">
          <Link to="/" className="inline-block mb-6">
            <img 
              src="/lovable-uploads/d073fb44-8fd6-46e0-9ca1-f74baca3bb5b.png" 
              alt="App do Redator Logo" 
              className="h-20 w-20 mx-auto" 
            />
          </Link>
          
          <h1 className="text-3xl font-bold text-redator-primary mb-2">
            Acesso do Aluno
          </h1>
          <p className="text-redator-accent">
            Digite apenas seu e-mail cadastrado
          </p>
        </div>

        <Card className="shadow-xl border-redator-accent/20">
          <CardHeader className="space-y-4">
            <CardTitle className="text-center text-redator-primary flex items-center justify-center gap-2">
              <User className="w-5 h-5" />
              Login do Aluno
            </CardTitle>
          </CardHeader>
          
          <CardContent>
            <div className="space-y-6">
              {/* Campo de E-mail */}
              <div className="space-y-3">
                <Label htmlFor="email" className="text-redator-primary font-medium">
                  Digite seu e-mail cadastrado
                </Label>
                <div className="relative">
                  <Input
                    id="email"
                    type="email"
                    value={emailDigitado}
                    onChange={(e) => setEmailDigitado(e.target.value)}
                    placeholder="Digite seu e-mail cadastrado"
                    className="border-redator-accent/30 pl-10"
                    onKeyPress={(e) => e.key === 'Enter' && handleLoginAluno()}
                  />
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                </div>
                <p className="text-xs text-gray-500">
                  Use o e-mail que foi cadastrado pelo professor
                </p>
              </div>

              {/* Botão de Login */}
              <Button 
                onClick={handleLoginAluno}
                disabled={loading}
                className="w-full bg-redator-primary hover:bg-redator-primary/90 text-white"
                size="lg"
              >
                <User className="w-5 h-5 mr-2" />
                {loading ? "Verificando..." : "Entrar como Aluno"}
              </Button>
            </div>

            {/* Links para outras opções */}
            <div className="text-center space-y-2 mt-6">
              <Link 
                to="/visitante-login" 
                className="block text-sm text-redator-accent hover:text-redator-primary transition-colors"
              >
                Sou visitante - Acessar sem turma
              </Link>
              <Link 
                to="/login" 
                className="block text-sm text-redator-accent hover:text-redator-primary transition-colors"
              >
                Sou professor - Acessar painel administrativo
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AlunoLogin;
