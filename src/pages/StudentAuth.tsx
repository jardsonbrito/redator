import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, UserPlus, LogIn, Mail, Lock, User, GraduationCap } from "lucide-react";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
import { useToast } from "@/hooks/use-toast";

export default function StudentAuth() {
  const navigate = useNavigate();
  const { signUp, signIn, loading } = useSupabaseAuth();
  const { toast } = useToast();

  // Estados para cadastro
  const [signUpData, setSignUpData] = useState({
    nome: "",
    sobrenome: "",
    email: "",
    password: "",
    confirmPassword: "",
    turma: ""
  });

  // Estados para login
  const [signInData, setSignInData] = useState({
    email: "",
    password: ""
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (signUpData.password !== signUpData.confirmPassword) {
      toast({
        title: "Erro no cadastro",
        description: "As senhas não coincidem.",
        variant: "destructive",
      });
      return;
    }

    if (signUpData.password.length < 6) {
      toast({
        title: "Erro no cadastro", 
        description: "A senha deve ter pelo menos 6 caracteres.",
        variant: "destructive",
      });
      return;
    }

    if (!signUpData.turma) {
      toast({
        title: "Erro no cadastro",
        description: "Por favor, selecione sua turma.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    const { error } = await signUp(signUpData.email, signUpData.password, {
      nome: signUpData.nome,
      sobrenome: signUpData.sobrenome,
      turma: signUpData.turma
    });

    if (error) {
      toast({
        title: "Erro no cadastro",
        description: error.message || "Ocorreu um erro ao criar sua conta.",
        variant: "destructive",
      });
    } else {
      // Resetar formulário
      setSignUpData({
        nome: "",
        sobrenome: "",
        email: "",
        password: "",
        confirmPassword: "",
        turma: ""
      });
    }

    setIsSubmitting(false);
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!signInData.email || !signInData.password) {
      toast({
        title: "Erro no login",
        description: "Por favor, preencha todos os campos.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    const { error } = await signIn(signInData.email, signInData.password);

    if (error) {
      toast({
        title: "Erro no login",
        description: error.message === 'Invalid login credentials' 
          ? "E-mail ou senha incorretos." 
          : "Ocorreu um erro ao fazer login.",
        variant: "destructive",
      });
    } else {
      navigate("/app");
    }

    setIsSubmitting(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-secondary/20 via-secondary/10 to-secondary/5 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-secondary/20 via-secondary/10 to-secondary/5">
      <div className="max-w-md mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <Link to="/">
            <Button variant="outline" size="sm" className="gap-2 border-primary/30 hover:bg-primary/10">
              <ArrowLeft className="w-4 h-4" />
              Voltar
            </Button>
          </Link>
          
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-primary to-secondary rounded-2xl blur opacity-30"></div>
              <div className="relative flex items-center justify-center w-10 h-10 rounded-2xl bg-gradient-to-r from-primary to-secondary shadow-lg">
                <GraduationCap className="w-5 h-5 text-white" />
              </div>
            </div>
            <div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                Portal do Aluno
              </h1>
            </div>
          </div>
        </div>

        {/* Card Principal */}
        <Card className="border-primary/20 shadow-xl">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              Acesso Seguro
            </CardTitle>
            <p className="text-muted-foreground">
              Entre com sua conta ou crie uma nova para acessar suas redações
            </p>
          </CardHeader>
          
          <CardContent>
            <Tabs defaultValue="login" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login" className="gap-2">
                  <LogIn className="w-4 h-4" />
                  Entrar
                </TabsTrigger>
                <TabsTrigger value="signup" className="gap-2">
                  <UserPlus className="w-4 h-4" />
                  Cadastrar
                </TabsTrigger>
              </TabsList>
              
              {/* Tab de Login */}
              <TabsContent value="login" className="space-y-4">
                <form onSubmit={handleSignIn} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="login-email" className="flex items-center gap-2">
                      <Mail className="w-4 h-4" />
                      E-mail
                    </Label>
                    <Input
                      id="login-email"
                      type="email"
                      placeholder="seu@email.com"
                      value={signInData.email}
                      onChange={(e) => setSignInData(prev => ({ ...prev, email: e.target.value }))}
                      className="border-primary/30 focus:border-primary"
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="login-password" className="flex items-center gap-2">
                      <Lock className="w-4 h-4" />
                      Senha
                    </Label>
                    <Input
                      id="login-password"
                      type="password"
                      placeholder="Sua senha"
                      value={signInData.password}
                      onChange={(e) => setSignInData(prev => ({ ...prev, password: e.target.value }))}
                      className="border-primary/30 focus:border-primary"
                      required
                    />
                  </div>
                  
                  <Button 
                    type="submit" 
                    className="w-full bg-primary hover:bg-primary/90"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? "Entrando..." : "Entrar"}
                  </Button>
                </form>
              </TabsContent>
              
              {/* Tab de Cadastro */}
              <TabsContent value="signup" className="space-y-4">
                <form onSubmit={handleSignUp} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="signup-nome" className="flex items-center gap-2">
                        <User className="w-4 h-4" />
                        Nome
                      </Label>
                      <Input
                        id="signup-nome"
                        type="text"
                        placeholder="João"
                        value={signUpData.nome}
                        onChange={(e) => setSignUpData(prev => ({ ...prev, nome: e.target.value }))}
                        className="border-primary/30 focus:border-primary"
                        required
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="signup-sobrenome">Sobrenome</Label>
                      <Input
                        id="signup-sobrenome"
                        type="text"
                        placeholder="Silva"
                        value={signUpData.sobrenome}
                        onChange={(e) => setSignUpData(prev => ({ ...prev, sobrenome: e.target.value }))}
                        className="border-primary/30 focus:border-primary"
                        required
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="signup-turma" className="flex items-center gap-2">
                      <GraduationCap className="w-4 h-4" />
                      Turma
                    </Label>
                    <Select value={signUpData.turma} onValueChange={(value) => setSignUpData(prev => ({ ...prev, turma: value }))}>
                      <SelectTrigger className="border-primary/30 focus:border-primary">
                        <SelectValue placeholder="Selecione sua turma" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Turma A">Turma A</SelectItem>
                        <SelectItem value="Turma B">Turma B</SelectItem>
                        <SelectItem value="Turma C">Turma C</SelectItem>
                        <SelectItem value="Turma D">Turma D</SelectItem>
                        <SelectItem value="Turma E">Turma E</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="signup-email" className="flex items-center gap-2">
                      <Mail className="w-4 h-4" />
                      E-mail
                    </Label>
                    <Input
                      id="signup-email"
                      type="email"
                      placeholder="seu@email.com"
                      value={signUpData.email}
                      onChange={(e) => setSignUpData(prev => ({ ...prev, email: e.target.value }))}
                      className="border-primary/30 focus:border-primary"
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="signup-password" className="flex items-center gap-2">
                      <Lock className="w-4 h-4" />
                      Senha
                    </Label>
                    <Input
                      id="signup-password"
                      type="password"
                      placeholder="Mínimo 6 caracteres"
                      value={signUpData.password}
                      onChange={(e) => setSignUpData(prev => ({ ...prev, password: e.target.value }))}
                      className="border-primary/30 focus:border-primary"
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="signup-confirm-password">Confirmar Senha</Label>
                    <Input
                      id="signup-confirm-password"
                      type="password"
                      placeholder="Digite a senha novamente"
                      value={signUpData.confirmPassword}
                      onChange={(e) => setSignUpData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                      className="border-primary/30 focus:border-primary"
                      required
                    />
                  </div>
                  
                  <Button 
                    type="submit" 
                    className="w-full bg-primary hover:bg-primary/90"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? "Criando conta..." : "Criar Conta"}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
            
            {/* Link para sistema antigo */}
            <div className="mt-6 pt-6 border-t border-primary/20 text-center">
              <p className="text-sm text-muted-foreground mb-2">
                Ainda usa o sistema antigo?
              </p>
              <Link to="/aluno-login">
                <Button variant="outline" size="sm" className="border-primary/30 hover:bg-primary/10">
                  Entrar com senha da turma
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}