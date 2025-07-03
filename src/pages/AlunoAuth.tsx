import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { User, ArrowLeft, UserPlus, LogIn } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

const AlunoAuth = () => {
  const [activeTab, setActiveTab] = useState("login");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  
  // Estados para login
  const [loginData, setLoginData] = useState({
    email: "",
    password: ""
  });
  
  // Estados para cadastro
  const [signupData, setSignupData] = useState({
    nome: "",
    sobrenome: "",
    email: "",
    password: "",
    turma: ""
  });

  const turmas = [
    { value: "Turma A", label: "Turma A" },
    { value: "Turma B", label: "Turma B" },
    { value: "Turma C", label: "Turma C" },
    { value: "Turma D", label: "Turma D" },
    { value: "Turma E", label: "Turma E" },
    { value: "Visitante", label: "Visitante" }
  ];

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: loginData.email,
        password: loginData.password,
      });

      if (error) {
        toast({
          title: "Erro no login",
          description: error.message === "Invalid login credentials" 
            ? "Email ou senha incorretos" 
            : error.message,
          variant: "destructive",
        });
        return;
      }

      if (data.user) {
        toast({
          title: "Login realizado com sucesso!",
          description: "Redirecionando para sua área...",
        });
        navigate("/app", { replace: true });
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

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!signupData.nome.trim() || !signupData.sobrenome.trim() || !signupData.email.trim() || !signupData.password.trim() || !signupData.turma) {
      toast({
        title: "Preencha todos os campos",
        description: "Todos os campos são obrigatórios.",
        variant: "destructive",
      });
      return;
    }

    if (signupData.password.length < 6) {
      toast({
        title: "Senha muito curta",
        description: "A senha deve ter pelo menos 6 caracteres.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signUp({
        email: signupData.email,
        password: signupData.password,
        options: {
          data: {
            nome: signupData.nome,
            sobrenome: signupData.sobrenome,
            user_type: 'aluno',
            turma: signupData.turma
          }
        }
      });

      if (error) {
        toast({
          title: "Erro no cadastro",
          description: error.message === "User already registered" 
            ? "Este email já está cadastrado" 
            : error.message,
          variant: "destructive",
        });
        return;
      }

      if (data.user) {
        toast({
          title: "Cadastro realizado com sucesso!",
          description: "Você já pode fazer login e acessar sua área.",
        });
        setActiveTab("login");
        setLoginData({ email: signupData.email, password: "" });
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
            Área do Aluno
          </h1>
          <p className="text-redator-accent">
            Faça login ou cadastre-se para acessar
          </p>
        </div>

        <Card className="shadow-xl border-redator-accent/20">
          <CardHeader>
            <CardTitle className="text-center text-redator-primary">
              Acesso Individual
            </CardTitle>
          </CardHeader>
          
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="login" className="flex items-center gap-2">
                  <LogIn className="w-4 h-4" />
                  Entrar
                </TabsTrigger>
                <TabsTrigger value="signup" className="flex items-center gap-2">
                  <UserPlus className="w-4 h-4" />
                  Cadastrar
                </TabsTrigger>
              </TabsList>

              <TabsContent value="login">
                <form onSubmit={handleLogin} className="space-y-4">
                  <div>
                    <Label htmlFor="login-email">E-mail</Label>
                    <Input
                      id="login-email"
                      type="email"
                      value={loginData.email}
                      onChange={(e) => setLoginData(prev => ({...prev, email: e.target.value}))}
                      placeholder="Digite seu e-mail"
                      className="border-redator-accent/30"
                      required
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="login-password">Senha</Label>
                    <Input
                      id="login-password"
                      type="password"
                      value={loginData.password}
                      onChange={(e) => setLoginData(prev => ({...prev, password: e.target.value}))}
                      placeholder="Digite sua senha"
                      className="border-redator-accent/30"
                      required
                    />
                  </div>
                  
                  <Button 
                    type="submit"
                    disabled={loading}
                    className="w-full bg-redator-primary hover:bg-redator-primary/90"
                  >
                    {loading ? "Entrando..." : "Entrar"}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="signup">
                <form onSubmit={handleSignup} className="space-y-4">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label htmlFor="signup-nome">Nome</Label>
                      <Input
                        id="signup-nome"
                        value={signupData.nome}
                        onChange={(e) => setSignupData(prev => ({...prev, nome: e.target.value}))}
                        placeholder="Nome"
                        className="border-redator-accent/30"
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="signup-sobrenome">Sobrenome</Label>
                      <Input
                        id="signup-sobrenome"
                        value={signupData.sobrenome}
                        onChange={(e) => setSignupData(prev => ({...prev, sobrenome: e.target.value}))}
                        placeholder="Sobrenome"
                        className="border-redator-accent/30"
                        required
                      />
                    </div>
                  </div>
                  
                  <div>
                    <Label htmlFor="signup-email">E-mail</Label>
                    <Input
                      id="signup-email"
                      type="email"
                      value={signupData.email}
                      onChange={(e) => setSignupData(prev => ({...prev, email: e.target.value}))}
                      placeholder="Digite seu e-mail"
                      className="border-redator-accent/30"
                      required
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="signup-password">Criar Senha</Label>
                    <Input
                      id="signup-password"
                      type="password"
                      value={signupData.password}
                      onChange={(e) => setSignupData(prev => ({...prev, password: e.target.value}))}
                      placeholder="Mínimo 6 caracteres"
                      className="border-redator-accent/30"
                      required
                      minLength={6}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="signup-turma">Turma</Label>
                    <Select value={signupData.turma} onValueChange={(value) => setSignupData(prev => ({...prev, turma: value}))}>
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
                  
                  <Button 
                    type="submit"
                    disabled={loading}
                    className="w-full bg-green-600 hover:bg-green-700"
                  >
                    {loading ? "Cadastrando..." : "Cadastrar"}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>

            <div className="text-center mt-6 space-y-2">
              <Link 
                to="/visitante-login" 
                className="block text-sm text-redator-accent hover:text-redator-primary transition-colors"
              >
                Sou visitante - Acessar sem cadastro
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

export default AlunoAuth;