
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Lock } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { useStudentAuth } from "@/hooks/useStudentAuth";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

const Welcome = () => {
  const [selectedProfile, setSelectedProfile] = useState<"professor" | "aluno" | "visitante">("aluno");
  
  const [emailAluno, setEmailAluno] = useState("");
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


  const handleLogin = async () => {
    setLoading(true);

    try {
      if (selectedProfile === "professor") {
        if (!emailProfessor || !senhaProfessor) {
          toast({
            title: "Campos obrigatórios",
            description: "Por favor, preencha email and senha.",
            variant: "destructive"
          });
          return;
        }

        const { error } = await signIn(emailProfessor, senhaProfessor);
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
      } else if (selectedProfile === "aluno") {
        if (!emailAluno.trim()) {
          toast({
            title: "Campo obrigatório",
            description: "Por favor, digite seu e-mail.",
            variant: "destructive"
          });
          return;
        }

        // Normalizar email de forma mais robusta
        const emailNormalizado = emailAluno.trim().toLowerCase().replace(/\s+/g, '');
        console.log('🔍 DEBUG - Email original:', emailAluno);
        console.log('🔍 DEBUG - Email normalizado:', emailNormalizado);
        console.log('🔍 DEBUG - User Agent:', navigator.userAgent);

        // Buscar aluno na base (mesma lógica do AlunoLogin.tsx)
        try {
          const { data: aluno, error } = await supabase
            .from("profiles")
            .select("id, nome, email, turma")
            .eq("email", emailNormalizado)
            .eq("user_type", "aluno")
            .maybeSingle();

          console.log('🔍 DEBUG - Resultado da busca:', { aluno, error });
          console.log('🔍 DEBUG - Query executada:', `email = '${emailNormalizado}' AND user_type = 'aluno'`);

          if (error) {
            console.error('Erro na consulta:', error);
            throw error;
          }

          if (!aluno) {
            console.log('Aluno não encontrado para email:', emailAluno.trim().toLowerCase());
            
            // Tentar buscar emails similares para ajudar o usuário
            const { data: emailsSimilares } = await supabase
              .from("profiles")
              .select("email, nome")
              .eq("user_type", "aluno")
              .ilike("email", `%${emailAluno.split('@')[0]}%`);
            
            let descricaoErro = "Verifique se você foi cadastrado pelo professor ou se o e-mail está correto.";
            
            if (emailsSimilares && emailsSimilares.length > 0) {
              const emailSugerido = emailsSimilares[0].email;
              descricaoErro = `E-mail não encontrado. Você quis dizer: ${emailSugerido}?`;
            }
            
            toast({
              title: "E-mail não encontrado",
              description: descricaoErro,
              variant: "destructive"
            });
            return;
          }

          // Login bem-sucedido - usar a turma do aluno encontrado
          console.log('Login bem-sucedido para:', aluno.nome, 'Turma:', aluno.turma);
          loginAsStudent(aluno.turma);
          toast({
            title: "Acesso liberado!",
            description: `Bem-vindo, ${aluno.nome}!`
          });
          navigate("/app", { replace: true });

        } catch (error: any) {
          console.error("Erro na validação do aluno:", error);
          toast({
            title: "Erro na validação",
            description: "Ocorreu um erro ao verificar seus dados. Tente novamente.",
            variant: "destructive"
          });
          return;
        }
      } else if (selectedProfile === "visitante") {
        if (!nomeVisitante.trim() || !emailVisitante.trim()) {
          toast({
            title: "Preencha todos os campos",
            description: "Nome e e-mail são obrigatórios.",
            variant: "destructive"
          });
          return;
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(emailVisitante)) {
          toast({
            title: "E-mail inválido",
            description: "Por favor, insira um e-mail válido.",
            variant: "destructive"
          });
          return;
        }

        loginAsVisitante(nomeVisitante.trim(), emailVisitante.trim());
        toast({
          title: "Bem-vindo, visitante!",
          description: `Olá, ${nomeVisitante}! Acesso liberado.`
        });
        navigate("/app", { replace: true });
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-violet-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-6">
            <img 
              src="/lovable-uploads/f86e5092-80dc-4e06-bb6a-f4cec6ee1b5b.png" 
              alt="Logo da plataforma" 
              className="w-20 h-20 object-contain" 
            />
          </div>
          
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
            <div className="grid grid-cols-3 gap-2">
              <Button
                variant={selectedProfile === "professor" ? "default" : "outline"}
                onClick={() => setSelectedProfile("professor")}
                className={`h-16 text-xs ${
                  selectedProfile === "professor"
                    ? "bg-redator-primary hover:bg-redator-primary/90 text-white"
                    : "border-redator-accent/30 text-redator-primary hover:bg-redator-primary/10"
                }`}
              >
                Sou Professor
              </Button>
              <Button
                variant={selectedProfile === "aluno" ? "default" : "outline"}
                onClick={() => setSelectedProfile("aluno")}
                className={`h-16 text-xs ${
                  selectedProfile === "aluno"
                    ? "bg-redator-primary hover:bg-redator-primary/90 text-white"
                    : "border-redator-accent/30 text-redator-primary hover:bg-redator-primary/10"
                }`}
              >
                Sou Aluno
              </Button>
              <Button
                variant={selectedProfile === "visitante" ? "default" : "outline"}
                onClick={() => setSelectedProfile("visitante")}
                className={`h-16 text-xs ${
                  selectedProfile === "visitante"
                    ? "bg-redator-primary hover:bg-redator-primary/90 text-white"
                    : "border-redator-accent/30 text-redator-primary hover:bg-redator-primary/10"
                }`}
              >
                Sou Visitante
              </Button>
            </div>

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
              <div>
                <Label htmlFor="email-aluno" className="text-redator-primary font-medium">E-mail</Label>
                <Input
                  id="email-aluno"
                  type="email"
                  value={emailAluno}
                  onChange={(e) => setEmailAluno(e.target.value)}
                  placeholder="Digite seu e-mail cadastrado"
                  className="mt-1 border-redator-accent/30"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Use o e-mail que foi cadastrado pelo professor
                </p>
              </div>
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

            {/* Botão Entrar */}
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

export default Welcome;
