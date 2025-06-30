
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { User, Lock, ArrowLeft } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { useStudentAuth } from "@/hooks/useStudentAuth";

const AlunoLogin = () => {
  const [turmaSelecionada, setTurmaSelecionada] = useState("");
  const [senhaDigitada, setSenhaDigitada] = useState("");
  const navigate = useNavigate();
  const { toast } = useToast();
  const { loginAsStudent } = useStudentAuth();

  const turmas = [
    { value: "Turma A", label: "Turma A", senha: "LRA2025" },
    { value: "Turma B", label: "Turma B", senha: "LRB2025" },
    { value: "Turma C", label: "Turma C", senha: "LRC2025" },
    { value: "Turma D", label: "Turma D", senha: "LRD2025" },
    { value: "Turma E", label: "Turma E", senha: "LRE2025" }
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

    if (!senhaDigitada) {
      toast({
        title: "Digite a senha",
        description: "A senha da turma é obrigatória.",
        variant: "destructive",
      });
      return;
    }

    // Verifica se a senha está correta para a turma selecionada
    const turmaEncontrada = turmas.find(turma => turma.value === turmaSelecionada);
    if (!turmaEncontrada || senhaDigitada !== turmaEncontrada.senha) {
      toast({
        title: "Senha incorreta",
        description: "A senha digitada não confere com a senha da turma selecionada.",
        variant: "destructive",
      });
      return;
    }

    // Login usando o sistema de autenticação
    loginAsStudent(turmaSelecionada);
    
    toast({
      title: "Acesso liberado!",
      description: `Bem-vindo à ${turmaSelecionada}!`,
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
            Acesso do Aluno
          </h1>
          <p className="text-redator-accent">
            Selecione sua turma e digite a senha
          </p>
        </div>

        <Card className="shadow-xl border-redator-accent/20">
          <CardHeader className="space-y-4">
            <CardTitle className="text-center text-redator-primary flex items-center justify-center gap-2">
              <User className="w-5 h-5" />
              Login por Turma
            </CardTitle>
          </CardHeader>
          
          <CardContent className="space-y-6">
            {/* Seleção de Turma - SEM mostrar as senhas */}
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

            {/* Campo de Senha */}
            <div className="space-y-3">
              <Label htmlFor="senha" className="text-redator-primary font-medium">
                Senha da Turma
              </Label>
              <div className="relative">
                <Input
                  id="senha"
                  type="password"
                  value={senhaDigitada}
                  onChange={(e) => setSenhaDigitada(e.target.value)}
                  placeholder="Digite a senha da sua turma"
                  className="border-redator-accent/30 pl-10"
                />
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              </div>
              <p className="text-xs text-gray-500">
                A senha é fornecida pelo seu professor
              </p>
            </div>

            {/* Botão de Acesso */}
            <Button 
              onClick={handleAcessoTurma}
              className="w-full bg-redator-primary hover:bg-redator-primary/90 text-white"
              size="lg"
            >
              <User className="w-5 h-5 mr-2" />
              Acessar como Aluno
            </Button>

            {/* Links para outras opções */}
            <div className="text-center space-y-2">
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
