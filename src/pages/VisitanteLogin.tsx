
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UserPlus, ArrowLeft } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { useStudentAuth } from "@/hooks/useStudentAuth";

const VisitanteLogin = () => {
  const [nomeVisitante, setNomeVisitante] = useState("");
  const [emailVisitante, setEmailVisitante] = useState("");
  const navigate = useNavigate();
  const { toast } = useToast();
  const { loginAsVisitante } = useStudentAuth();

  const handleAcessoVisitante = () => {
    if (!nomeVisitante.trim() || !emailVisitante.trim()) {
      toast({
        title: "Preencha todos os campos",
        description: "Nome e e-mail são obrigatórios.",
        variant: "destructive",
      });
      return;
    }

    // Validação básica de e-mail
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailVisitante)) {
      toast({
        title: "E-mail inválido",
        description: "Por favor, insira um e-mail válido.",
        variant: "destructive",
      });
      return;
    }

    // Login como visitante
    loginAsVisitante(nomeVisitante.trim(), emailVisitante.trim());

    toast({
      title: "Bem-vindo, visitante!",
      description: `Olá, ${nomeVisitante}! Acesso liberado.`,
    });

    navigate("/app", { replace: true });
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
            Acesso de Visitante
          </h1>
          <p className="text-redator-accent">
            Preencha seus dados para acessar o conteúdo
          </p>
        </div>

        <Card className="shadow-xl border-redator-accent/20">
          <CardHeader className="space-y-4">
            <CardTitle className="text-center text-redator-primary flex items-center justify-center gap-2">
              <UserPlus className="w-5 h-5" />
              Login de Visitante
            </CardTitle>
          </CardHeader>
          
          <CardContent className="space-y-6">
            <div>
              <Label htmlFor="nome-visitante" className="text-redator-primary font-medium">Nome Completo *</Label>
              <Input
                id="nome-visitante"
                value={nomeVisitante}
                onChange={(e) => setNomeVisitante(e.target.value)}
                placeholder="Digite seu nome completo"
                className="mt-1 border-redator-accent/30"
              />
            </div>
            
            <div>
              <Label htmlFor="email-visitante" className="text-redator-primary font-medium">E-mail *</Label>
              <Input
                id="email-visitante"
                type="email"
                value={emailVisitante}
                onChange={(e) => setEmailVisitante(e.target.value)}
                placeholder="Digite seu e-mail"
                className="mt-1 border-redator-accent/30"
              />
            </div>
            
            <Button 
              onClick={handleAcessoVisitante}
              className="w-full bg-green-600 hover:bg-green-700 text-white"
              size="lg"
            >
              <UserPlus className="w-5 h-5 mr-2" />
              Acessar como Visitante
            </Button>

            {/* Links para outras opções */}
            <div className="text-center space-y-2">
              <Link 
                to="/aluno-login" 
                className="block text-sm text-redator-accent hover:text-redator-primary transition-colors"
              >
                Sou aluno - Fazer login por turma
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

export default VisitanteLogin;
