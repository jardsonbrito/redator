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
  
  // Estados para login simplificado (apenas e-mail)
  const [loginEmail, setLoginEmail] = useState("");
  
  // Estados para cadastro
  const [signupData, setSignupData] = useState({
    nome: "",
    email: "",
    turma: ""
  });

  const turmas = [
    { value: "LRA 2025", label: "LRA 2025" },
    { value: "LRB 2025", label: "LRB 2025" },
    { value: "LRC 2025", label: "LRC 2025" },
    { value: "LRD 2025", label: "LRD 2025" },
    { value: "LRE 2025", label: "LRE 2025" },
    { value: "VISITANTE", label: "VISITANTE" }
  ];

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!loginEmail.trim()) {
      toast({
        title: "E-mail obrigatório",
        description: "Por favor, digite seu e-mail para acessar.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      // Verificar se o perfil existe no banco
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('email', loginEmail.trim())
        .single();

      if (error || !profile) {
        toast({
          title: "E-mail não encontrado",
          description: "Este e-mail não está cadastrado. Faça seu cadastro primeiro.",
          variant: "destructive",
        });
        setActiveTab("signup");
        setSignupData(prev => ({ ...prev, email: loginEmail.trim() }));
        return;
      }

      // Simular login direto com o perfil encontrado
      toast({
        title: "Acesso liberado!",
        description: `Bem-vindo(a), ${profile.nome}!`,
      });
      
      // Armazenar dados do usuário no localStorage para simular sessão
      localStorage.setItem('user_profile', JSON.stringify(profile));
      navigate("/app", { replace: true });
      
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
    
    if (!signupData.nome.trim() || !signupData.email.trim() || !signupData.turma) {
      toast({
        title: "Preencha todos os campos",
        description: "Nome, e-mail e turma são obrigatórios.",
        variant: "destructive",
      });
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(signupData.email)) {
      toast({
        title: "E-mail inválido",
        description: "Por favor, insira um e-mail válido.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      // Verificar se o e-mail já existe
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('email')
        .eq('email', signupData.email.trim())
        .single();

      if (existingProfile) {
        toast({
          title: "E-mail já cadastrado",
          description: "Este e-mail já possui cadastro. Use a aba 'Entrar' para acessar.",
          variant: "destructive",
        });
        setActiveTab("login");
        setLoginEmail(signupData.email.trim());
        return;
      }

      // Criar perfil diretamente na tabela profiles usando RPC
      const { data, error } = await supabase.rpc('create_simple_profile', {
        p_nome: signupData.nome.trim(),
        p_email: signupData.email.trim(),
        p_turma: signupData.turma
      });

      if (error) {
        console.error('Erro na criação do perfil:', error);
        
        // Verificar tipos específicos de erro
        if (error.message?.includes('duplicate') || error.message?.includes('unique')) {
          toast({
            title: "E-mail já cadastrado",
            description: "Este e-mail já possui cadastro. Use a aba 'Entrar' para acessar.",
            variant: "destructive",
          });
          setActiveTab("login");
          setLoginEmail(signupData.email.trim());
        } else if (error.message?.includes('permission') || error.message?.includes('policy')) {
          toast({
            title: "Erro de permissão",
            description: "Problema de acesso ao banco de dados. Tente novamente ou contate o suporte.",
            variant: "destructive",
          });
        } else {
          toast({
            title: "Erro no cadastro",
            description: error.message || "Não foi possível concluir o cadastro. Tente novamente.",
            variant: "destructive",
          });
        }
        return;
      }

      if (data && data.length > 0) {
        const profile = data[0];
        toast({
          title: "Cadastro realizado com sucesso!",
          description: `Bem-vindo(a), ${profile.nome}! Entrando na sua área...`,
        });
        
        // Armazenar dados do usuário no localStorage
        localStorage.setItem('user_profile', JSON.stringify(profile));
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
            Entre com seu e-mail ou cadastre-se pela primeira vez
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
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      placeholder="Digite seu e-mail cadastrado"
                      className="border-redator-accent/30"
                      required
                    />
                  </div>
                  
                  <Button 
                    type="submit"
                    disabled={loading}
                    className="w-full bg-redator-primary hover:bg-redator-primary/90"
                  >
                    {loading ? "Verificando..." : "Entrar"}
                  </Button>
                  
                  <p className="text-xs text-gray-500 text-center">
                    Digite apenas seu e-mail para acessar sua área
                  </p>
                </form>
              </TabsContent>

              <TabsContent value="signup">
                <form onSubmit={handleSignup} className="space-y-4">
                  <div>
                    <Label htmlFor="signup-nome">Nome Completo</Label>
                    <Input
                      id="signup-nome"
                      value={signupData.nome}
                      onChange={(e) => setSignupData(prev => ({...prev, nome: e.target.value}))}
                      placeholder="Digite seu nome completo"
                      className="border-redator-accent/30"
                      required
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="signup-email">E-mail</Label>
                    <Input
                      id="signup-email"
                      type="email"
                      value={signupData.email}
                      onChange={(e) => setSignupData(prev => ({...prev, email: e.target.value}))}
                      placeholder="Digite seu e-mail (será sua chave de acesso)"
                      className="border-redator-accent/30"
                      required
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
                    {loading ? "Cadastrando..." : "Criar Conta"}
                  </Button>
                  
                  <p className="text-xs text-gray-500 text-center">
                    Não exigimos senha. Seu e-mail será sua chave de acesso.
                  </p>
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