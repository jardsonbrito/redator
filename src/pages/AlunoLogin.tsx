
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { User, UserPlus } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

const AlunoLogin = () => {
  const [turmaSelecionada, setTurmaSelecionada] = useState("");
  const [nomeVisitante, setNomeVisitante] = useState("");
  const [emailVisitante, setEmailVisitante] = useState("");
  const [isVisitanteDialogOpen, setIsVisitanteDialogOpen] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const turmas = [
    { value: "Turma A", label: "Turma A" },
    { value: "Turma B", label: "Turma B" },
    { value: "Turma C", label: "Turma C" },
    { value: "Turma D", label: "Turma D" },
    { value: "Turma E", label: "Turma E" }
  ];

  const handleAcessoTurma = () => {
    if (!turmaSelecionada) {
      toast({
        title: "Selecione uma turma",
        description: "Por favor, escolha sua turma para continuar.",
        variant: "destructive",
      });
      return;
    }

    // Salva a turma no localStorage
    localStorage.setItem("alunoTurma", turmaSelecionada);
    localStorage.setItem("userType", "aluno");
    localStorage.removeItem("visitanteData"); // Remove dados de visitante se houver
    
    toast({
      title: "Acesso liberado!",
      description: `Bem-vindo à ${turmaSelecionada}!`,
    });

    navigate("/app");
  };

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

    // Salva os dados do visitante
    const visitanteData = {
      nome: nomeVisitante.trim(),
      email: emailVisitante.trim().toLowerCase(),
      tipo: "visitante"
    };

    localStorage.setItem("visitanteData", JSON.stringify(visitanteData));
    localStorage.setItem("userType", "visitante");
    localStorage.setItem("alunoTurma", "visitante");
    localStorage.removeItem("alunoTurma"); // Remove turma se houver

    toast({
      title: "Bem-vindo, visitante!",
      description: `Olá, ${nomeVisitante}! Acesso liberado.`,
    });

    setIsVisitanteDialogOpen(false);
    navigate("/app");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-violet-100 flex items-center justify-center">
      <div className="w-full max-w-md px-4">
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
            Selecione sua turma para continuar
          </p>
        </div>

        <Card className="shadow-xl border-redator-accent/20">
          <CardHeader className="space-y-4">
            <CardTitle className="text-center text-redator-primary">
              Faça seu login
            </CardTitle>
          </CardHeader>
          
          <CardContent className="space-y-6">
            {/* Seleção de Turma */}
            <div className="space-y-3">
              <Label htmlFor="turma" className="text-redator-primary font-medium">
                Sua Turma
              </Label>
              <Select value={turmaSelecionada} onValueChange={setTurmaSelecionada}>
                <SelectTrigger className="border-redator-accent/30">
                  <SelectValue placeholder="Escolha sua turma" />
                </SelectTrigger>
                <SelectContent>
                  {turmas.map((turma) => (
                    <SelectItem key={turma.value} value={turma.value}>
                      {turma.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Botão de Acesso por Turma */}
            <Button 
              onClick={handleAcessoTurma}
              className="w-full bg-redator-primary hover:bg-redator-primary/90 text-white"
              size="lg"
            >
              <User className="w-5 h-5 mr-2" />
              Acessar como Aluno
            </Button>

            {/* Divisor */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-redator-accent/30" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-2 text-redator-accent">ou</span>
              </div>
            </div>

            {/* Botão Visitante */}
            <Dialog open={isVisitanteDialogOpen} onOpenChange={setIsVisitanteDialogOpen}>
              <DialogTrigger asChild>
                <Button 
                  variant="outline" 
                  className="w-full border-redator-secondary text-redator-secondary hover:bg-redator-secondary hover:text-white"
                  size="lg"
                >
                  <UserPlus className="w-5 h-5 mr-2" />
                  Sou Visitante
                </Button>
              </DialogTrigger>
              
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle className="text-redator-primary">Acesso de Visitante</DialogTitle>
                </DialogHeader>
                
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="nome-visitante">Nome Completo *</Label>
                    <Input
                      id="nome-visitante"
                      value={nomeVisitante}
                      onChange={(e) => setNomeVisitante(e.target.value)}
                      placeholder="Digite seu nome completo"
                      className="mt-1"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="email-visitante">E-mail *</Label>
                    <Input
                      id="email-visitante"
                      type="email"
                      value={emailVisitante}
                      onChange={(e) => setEmailVisitante(e.target.value)}
                      placeholder="Digite seu e-mail"
                      className="mt-1"
                    />
                  </div>
                  
                  <Button 
                    onClick={handleAcessoVisitante}
                    className="w-full bg-redator-secondary hover:bg-redator-secondary/90"
                  >
                    Acessar como Visitante
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            {/* Link para Professor */}
            <div className="text-center">
              <Link 
                to="/login" 
                className="text-sm text-redator-accent hover:text-redator-primary transition-colors"
              >
                Sou professor - Fazer login
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Link para voltar */}
        <div className="text-center mt-6">
          <Link 
            to="/" 
            className="text-sm text-redator-accent hover:text-redator-primary transition-colors"
          >
            ← Voltar ao início
          </Link>
        </div>
      </div>
    </div>
  );
};

export default AlunoLogin;
