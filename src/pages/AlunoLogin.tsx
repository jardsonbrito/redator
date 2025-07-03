
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { User, Lock, ArrowLeft, Mail } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { useStudentAuth } from "@/hooks/useStudentAuth";
import { supabase } from "@/integrations/supabase/client";

const AlunoLogin = () => {
  const [turmaSelecionada, setTurmaSelecionada] = useState("");
  const [senhaDigitada, setSenhaDigitada] = useState("");
  const [emailDigitado, setEmailDigitado] = useState("");
  const [turmaEmail, setTurmaEmail] = useState("");
  const [loading, setLoading] = useState(false);
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

  const handleLoginComEmail = async () => {
    if (!turmaEmail) {
      toast({
        title: "Selecione uma turma",
        description: "Por favor, escolha sua turma para continuar.",
        variant: "destructive",
      });
      return;
    }

    if (!emailDigitado) {
      toast({
        title: "Digite seu e-mail",
        description: "O e-mail é obrigatório para o login.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      // Verificar se o aluno existe na tabela profiles
      const { data: aluno, error } = await supabase
        .from("profiles")
        .select("id, nome, email, turma")
        .eq("email", emailDigitado.toLowerCase().trim())
        .eq("turma", turmaEmail)
        .eq("user_type", "aluno")
        .eq("is_authenticated_student", true)
        .maybeSingle();

      if (error) {
        throw error;
      }

      if (!aluno) {
        toast({
          title: "Acesso negado",
          description: "E-mail não encontrado na turma selecionada. Verifique seus dados ou procure o professor.",
          variant: "destructive",
        });
        return;
      }

      // Login usando o sistema de autenticação
      loginAsStudent(turmaEmail);
      
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
            Selecione sua turma e digite a senha
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
            <Tabs defaultValue="turma" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="turma">Por Turma</TabsTrigger>
                <TabsTrigger value="email">Por E-mail</TabsTrigger>
              </TabsList>
              
              <TabsContent value="turma" className="space-y-6 mt-6">
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
              </TabsContent>

              <TabsContent value="email" className="space-y-6 mt-6">
                {/* Login com E-mail */}
                <div className="space-y-3">
                  <Label htmlFor="turma-email" className="text-redator-primary font-medium">
                    Sua Turma
                  </Label>
                  <Select value={turmaEmail} onValueChange={setTurmaEmail}>
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

                <div className="space-y-3">
                  <Label htmlFor="email" className="text-redator-primary font-medium">
                    Seu E-mail
                  </Label>
                  <div className="relative">
                    <Input
                      id="email"
                      type="email"
                      value={emailDigitado}
                      onChange={(e) => setEmailDigitado(e.target.value)}
                      placeholder="Digite seu e-mail cadastrado"
                      className="border-redator-accent/30 pl-10"
                    />
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  </div>
                  <p className="text-xs text-gray-500">
                    Use o e-mail que foi cadastrado pelo professor
                  </p>
                </div>

                {/* Botão de Login com E-mail */}
                <Button 
                  onClick={handleLoginComEmail}
                  disabled={loading}
                  className="w-full bg-redator-primary hover:bg-redator-primary/90 text-white"
                  size="lg"
                >
                  <Mail className="w-5 h-5 mr-2" />
                  {loading ? "Verificando..." : "Entrar com E-mail"}
                </Button>
              </TabsContent>
            </Tabs>

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
