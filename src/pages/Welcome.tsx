
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Lock, UserCheck, Users } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { useStudentAuth } from "@/hooks/useStudentAuth";
import { useAuth } from "@/hooks/useAuth";

const Welcome = () => {
  const [selectedProfile, setSelectedProfile] = useState<"professor" | "aluno" | "visitante" | "aluno_individual">("aluno_individual");
  const [turma, setTurma] = useState("");
  const [senha, setSenha] = useState("");
  const [nomeVisitante, setNomeVisitante] = useState("");
  const [emailVisitante, setEmailVisitante] = useState("");
  const [emailProfessor, setEmailProfessor] = useState("");
  const [senhaProfessor, setSenhaProfessor] = useState("");
  const [lembrarMe, setLembrarMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { loginAsStudent, loginAsVisitante } = useStudentAuth();
  const { signIn } = useAuth();

  const turmas = [
    { value: "Turma A", label: "Turma A", senha: "LRA2025" },
    { value: "Turma B", label: "Turma B", senha: "LRB2025" },
    { value: "Turma C", label: "Turma C", senha: "LRC2025" },
    { value: "Turma D", label: "Turma D", senha: "LRD2025" },
    { value: "Turma E", label: "Turma E", senha: "LRE2025" }
  ];

  const handleLogin = async () => {
    setLoading(true);
    try {
      if (selectedProfile === "professor") {
        if (!emailProfessor || !senhaProfessor) {
          toast({
            title: "Campos obrigatórios",
            description: "Por favor, preencha email e senha.",
            variant: "destructive",
          });
          return;
        }

        const { error } = await signIn(emailProfessor, senhaProfessor);
        if (error) {
          toast({
            title: "Erro no login",
            description: error.message || "Credenciais inválidas. Verifique email e senha.",
            variant: "destructive",
          });
        } else {
          toast({
            title: "Login realizado com sucesso!",
            description: "Redirecionando para o painel administrativo...",
          });
          setTimeout(() => {
            navigate('/admin', { replace: true });
          }, 1000);
        }
      } else if (selectedProfile === "aluno") {
        if (!turma || !senha) {
          toast({
            title: "Campos obrigatórios",
            description: "Por favor, selecione sua turma e digite a senha.",
            variant: "destructive",
          });
          return;
        }

        const turmaEncontrada = turmas.find(t => t.value === turma);
        if (!turmaEncontrada || senha !== turmaEncontrada.senha) {
          toast({
            title: "Senha incorreta",
            description: "A senha digitada não confere com a senha da turma selecionada.",
            variant: "destructive",
          });
          return;
        }

        loginAsStudent(turma);
        toast({
          title: "Acesso liberado!",
          description: `Bem-vindo à ${turma}!`,
        });
        navigate("/app", { replace: true });
      } else if (selectedProfile === "visitante") {
        if (!nomeVisitante.trim() || !emailVisitante.trim()) {
          toast({
            title: "Preencha todos os campos",
            description: "Nome e e-mail são obrigatórios.",
            variant: "destructive",
          });
          return;
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(emailVisitante)) {
          toast({
            title: "E-mail inválido",
            description: "Por favor, insira um e-mail válido.",
            variant: "destructive",
          });
          return;
        }

        loginAsVisitante(nomeVisitante.trim(), emailVisitante.trim());
        toast({
          title: "Bem-vindo, visitante!",
          description: `Olá, ${nomeVisitante}! Acesso liberado.`,
        });
        navigate("/app", { replace: true });
      } else if (selectedProfile === "aluno_individual") {
        // Redirecionar para página de autenticação individual
        navigate("/student-auth");
      }
    } catch (error: any) {
      console.error('Erro no login:', error);
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
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-violet-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          {/* Logo no topo */}
          <div className="flex justify-center mb-6">
            <img
              alt="Logo da plataforma"
              className="w-20 h-20 object-contain"
              src="/lovable-uploads/f86e5092-80dc-4e06-bb6a-f4cec6ee1b5b.png"
            />
          </div>
          
          {/* Texto de boas-vindas */}
          <h1 className="text-2xl font-bold text-redator-primary mb-2">
            Bem-vindo(a) à nossa plataforma
          </h1>
          <p className="text-sm text-redator-accent mb-8">
            Antes de entrar, selecione o tipo de perfil e em seguida preencha os dados solicitados.
          </p>
        </div>

        <Card className="shadow-xl border-redator-accent/20">
          <CardContent className="p-6 space-y-6">
            {/* Botões de perfil */}
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant={selectedProfile === "aluno_individual" ? "default" : "outline"}
                onClick={() => setSelectedProfile("aluno_individual")}
                className={`h-20 text-xs flex flex-col gap-2 ${
                  selectedProfile === "aluno_individual"
                    ? "bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white"
                    : "border-redator-accent/30 text-redator-primary hover:bg-green-50"
                }`}
              >
                <UserCheck className="w-5 h-5" />
                Aluno com Login Próprio
              </Button>
              
              <Button
                variant={selectedProfile === "professor" ? "default" : "outline"}
                onClick={() => setSelectedProfile("professor")}
                className={`h-20 text-xs flex flex-col gap-2 ${
                  selectedProfile === "professor"
                    ? "bg-redator-primary hover:bg-redator-primary/90 text-white"
                    : "border-redator-accent/30 text-redator-primary hover:bg-redator-primary/10"
                }`}
              >
                <Lock className="w-5 h-5" />
                Sou Professor
              </Button>
              
              <Button
                variant={selectedProfile === "aluno" ? "default" : "outline"}
                onClick={() => setSelectedProfile("aluno")}
                className={`h-20 text-xs flex flex-col gap-2 ${
                  selectedProfile === "aluno"
                    ? "bg-blue-500 hover:bg-blue-600 text-white"
                    : "border-redator-accent/30 text-redator-primary hover:bg-blue-50"
                }`}
              >
                <Users className="w-5 h-5" />
                Aluno (Senha da Turma)
              </Button>
              
              <Button
                variant={selectedProfile === "visitante" ? "default" : "outline"}
                onClick={() => setSelectedProfile("visitante")}
                className={`h-20 text-xs flex flex-col gap-2 ${
                  selectedProfile === "visitante"
                    ? "bg-gray-500 hover:bg-gray-600 text-white"
                    : "border-redator-accent/30 text-redator-primary hover:bg-gray-50"
                }`}
              >
                <Users className="w-5 h-5" />
                Sou Visitante
              </Button>
            </div>

            {/* Conteúdo dinâmico baseado no perfil selecionado */}
            {selectedProfile === "aluno_individual" && (
              <div className="text-center p-6 bg-gradient-to-r from-green-50 to-green-100 rounded-lg border border-green-200">
                <UserCheck className="w-12 h-12 text-green-600 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-green-800 mb-2">
                  Sistema de Login Individual
                </h3>
                <p className="text-green-700 mb-4 text-sm">
                  Crie sua conta personalizada ou faça login com seu e-mail e senha própria
                </p>
                <p className="text-xs text-green-600">
                  ✓ Maior segurança | ✓ Histórico personalizado | ✓ Acompanhamento individual
                </p>
              </div>
            )}

            {/* Campos dinâmicos baseados no perfil selecionado */}
            {selectedProfile === "professor" && (
              <>
                <div>
                  <Label htmlFor="email-professor" className="text-redator-primary font-medium">E-mail</Label>
                  <Input
                    id="email-professor"
                    type="email"
                    value={emailProfessor}
                    onChange={(e) => setEmailProfessor(e.target.value)}
                    placeholder="Digite seu e-mail"
                    className="mt-1 border-redator-accent/30"
                  />
                </div>
                <div>
                  <Label htmlFor="senha-professor" className="text-redator-primary font-medium">Senha</Label>
                  <div className="relative">
                    <Input
                      id="senha-professor"
                      type="password"
                      value={senhaProfessor}
                      onChange={(e) => setSenhaProfessor(e.target.value)}
                      placeholder="Digite sua senha"
                      className="mt-1 border-redator-accent/30 pl-10"
                    />
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  </div>
                </div>
              </>
            )}

            {selectedProfile === "aluno" && (
              <>
                <div>
                  <Label htmlFor="turma" className="text-redator-primary font-medium">Turma</Label>
                  <Select value={turma} onValueChange={setTurma}>
                    <SelectTrigger className="mt-1 border-redator-accent/30">
                      <SelectValue placeholder="Selecione sua turma" />
                    </SelectTrigger>
                    <SelectContent>
                      {turmas.map((turmaItem) => (
                        <SelectItem key={turmaItem.value} value={turmaItem.value}>
                          {turmaItem.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="senha-aluno" className="text-redator-primary font-medium">Senha</Label>
                  <div className="relative">
                    <Input
                      id="senha-aluno"
                      type="password"
                      value={senha}
                      onChange={(e) => setSenha(e.target.value)}
                      placeholder="Digite sua senha"
                      className="mt-1 border-redator-accent/30 pl-10"
                    />
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  </div>
                </div>
              </>
            )}

            {selectedProfile === "visitante" && (
              <>
                <div>
                  <Label htmlFor="nome-visitante" className="text-redator-primary font-medium">Nome Completo</Label>
                  <Input
                    id="nome-visitante"
                    value={nomeVisitante}
                    onChange={(e) => setNomeVisitante(e.target.value)}
                    placeholder="Digite seu nome completo"
                    className="mt-1 border-redator-accent/30"
                  />
                </div>
                <div>
                  <Label htmlFor="email-visitante" className="text-redator-primary font-medium">E-mail</Label>
                  <Input
                    id="email-visitante"
                    type="email"
                    value={emailVisitante}
                    onChange={(e) => setEmailVisitante(e.target.value)}
                    placeholder="Digite seu e-mail"
                    className="mt-1 border-redator-accent/30"
                  />
                </div>
              </>
            )}

            {/* Checkbox Lembre-se de mim */}
            {selectedProfile !== "aluno_individual" && (
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="lembrar-me"
                  checked={lembrarMe}
                  onCheckedChange={(checked) => setLembrarMe(checked === true)}
                />
                <Label htmlFor="lembrar-me" className="text-sm text-redator-accent">
                  Lembre-se de mim
                </Label>
              </div>
            )}

            {/* Botão Entrar */}
            <Button
              onClick={handleLogin}
              disabled={loading}
              className={`w-full h-12 ${
                selectedProfile === "aluno_individual"
                  ? "bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700"
                  : "bg-redator-primary hover:bg-redator-primary/90"
              } text-white`}
            >
              {loading ? 'Entrando...' : 
                selectedProfile === "aluno_individual" ? 'Acessar Sistema Individual' : 'Entrar'
              }
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Welcome;
