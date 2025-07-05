
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Mail, Lock, User } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useStudentAuth } from "@/hooks/useStudentAuth";
import { useCorretorAuth } from "@/hooks/useCorretorAuth";

type ProfileType = "aluno" | "visitante" | "corretor" | "adm";

const Login = () => {
  const [selectedProfile, setSelectedProfile] = useState<ProfileType>("aluno");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  
  const navigate = useNavigate();
  const { toast } = useToast();
  const { signIn } = useAuth();
  const { loginAsStudent, loginAsVisitante } = useStudentAuth();
  const { loginAsCorretor } = useCorretorAuth();

  const handleLogin = async () => {
    if (!email.trim()) {
      toast({
        title: "Campo obrigatório",
        description: "Por favor, digite seu e-mail.",
        variant: "destructive"
      });
      return;
    }

    if (selectedProfile === "visitante" && !name.trim()) {
      toast({
        title: "Campo obrigatório",
        description: "Por favor, digite seu nome completo.",
        variant: "destructive"
      });
      return;
    }

    if (selectedProfile === "adm" && !password.trim()) {
      toast({
        title: "Campo obrigatório",
        description: "Por favor, digite sua senha.",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);

    try {
      if (selectedProfile === "aluno") {
        const { supabase } = await import("@/integrations/supabase/client");
        const { normalizeEmail } = await import("@/utils/emailNormalizer");
        
        const emailNormalizado = normalizeEmail(email);
        const { data: aluno, error } = await supabase
          .from("profiles")
          .select("id, nome, email, turma")
          .eq("user_type", "aluno")
          .ilike("email", emailNormalizado)
          .limit(1)
          .maybeSingle();

        if (error || !aluno) {
          toast({
            title: "E-mail não encontrado",
            description: "E-mail não encontrado. Verifique se você foi cadastrado corretamente pelo professor.",
            variant: "destructive"
          });
          return;
        }

        loginAsStudent(aluno.turma);
        toast({
          title: "Acesso liberado!",
          description: `Bem-vindo, ${aluno.nome}!`
        });
        navigate("/app", { replace: true });

      } else if (selectedProfile === "visitante") {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
          toast({
            title: "E-mail inválido",
            description: "Por favor, insira um e-mail válido.",
            variant: "destructive"
          });
          return;
        }

        loginAsVisitante(name.trim(), email.trim());
        toast({
          title: "Bem-vindo, visitante!",
          description: `Olá, ${name}! Acesso liberado.`
        });
        navigate("/app", { replace: true });

      } else if (selectedProfile === "corretor") {
        const { error } = await loginAsCorretor(email, "temp_password");
        if (error) {
          toast({
            title: "Erro no login",
            description: "E-mail não encontrado ou corretor inativo.",
            variant: "destructive"
          });
        } else {
          toast({
            title: "Acesso liberado!",
            description: "Redirecionando para o painel do corretor..."
          });
          setTimeout(() => {
            navigate('/corretor', { replace: true });
          }, 1000);
        }

      } else if (selectedProfile === "adm") {
        const { error } = await signIn(email, password);
        if (error) {
          toast({
            title: "Erro no login",
            description: error.message || "Credenciais inválidas. Verifique email e senha.",
            variant: "destructive"
          });
        } else {
          toast({
            title: "Login realizado com sucesso!",
            description: "Redirecionando para o painel administrativo..."
          });
          setTimeout(() => {
            navigate('/admin', { replace: true });
          }, 1000);
        }
      }
    } catch (error: any) {
      console.error('Erro no login:', error);
      toast({
        title: "Erro inesperado",
        description: "Ocorreu um erro inesperado. Tente novamente.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const renderDynamicFields = () => {
    switch (selectedProfile) {
      case "aluno":
        return (
          <div>
            <Label htmlFor="email" className="text-redator-primary font-medium">
              E-mail
            </Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Digite seu e-mail cadastrado"
                className="mt-1 border-redator-accent/30 pl-10"
                autoComplete="email"
                autoCapitalize="none"
                autoCorrect="off"
                onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Use o e-mail que foi cadastrado pelo professor
            </p>
          </div>
        );

      case "visitante":
        return (
          <>
            <div>
              <Label htmlFor="name" className="text-redator-primary font-medium">
                Nome Completo
              </Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Digite seu nome completo"
                  className="mt-1 border-redator-accent/30 pl-10"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="email" className="text-redator-primary font-medium">
                E-mail
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Digite seu e-mail"
                  className="mt-1 border-redator-accent/30 pl-10"
                  onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
                />
              </div>
            </div>
          </>
        );

      case "corretor":
        return (
          <div>
            <Label htmlFor="email" className="text-redator-primary font-medium">
              E-mail
            </Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Digite seu e-mail de corretor"
                className="mt-1 border-redator-accent/30 pl-10"
                onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Digite o e-mail cadastrado como corretor para acessar o painel
            </p>
          </div>
        );

      case "adm":
        return (
          <>
            <div>
              <Label htmlFor="email" className="text-redator-primary font-medium">
                E-mail
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Digite seu e-mail"
                  className="mt-1 border-redator-accent/30 pl-10"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="password" className="text-redator-primary font-medium">
                Senha
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Digite sua senha"
                  className="mt-1 border-redator-accent/30 pl-10"
                  onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
                />
              </div>
            </div>
          </>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-violet-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo oficial e título */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <img 
              src="/lovable-uploads/f86e5092-80dc-4e06-bb6a-f4cec6ee1b5b.png" 
              alt="Logo da plataforma" 
              className="w-40 h-40 object-contain" 
            />
          </div>
          <h1 className="text-3xl font-bold text-redator-primary mb-2">
            App do Redator
          </h1>
          <p className="text-lg text-redator-accent">
            Redação na Prática, Aprovação na Certa!
          </p>
        </div>

        <Card className="shadow-xl border-redator-accent/20">
          <CardContent className="p-6 space-y-6">
            {/* Dropdown de seleção de perfil */}
            <div>
              <Label className="text-redator-primary font-medium">
                Selecione seu perfil:
              </Label>
              <Select value={selectedProfile} onValueChange={(value: ProfileType) => {
                setSelectedProfile(value);
                // Limpar campos ao trocar perfil
                setEmail("");
                setPassword("");
                setName("");
              }}>
                <SelectTrigger className="mt-1 border-redator-accent/30">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="aluno">Aluno</SelectItem>
                  <SelectItem value="visitante">Visitante</SelectItem>
                  <SelectItem value="corretor">Corretor</SelectItem>
                  <SelectItem value="adm">ADM</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Campos dinâmicos */}
            <div className="space-y-4">
              {renderDynamicFields()}
            </div>

            {/* Botão de Login */}
            <Button 
              onClick={handleLogin}
              disabled={loading}
              className="w-full bg-redator-primary hover:bg-redator-primary/90 text-white h-12"
            >
              {loading ? 'Entrando...' : 'Entrar'}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Login;
