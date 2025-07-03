
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Lock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface LoginFormProps {
  selectedProfile: "professor" | "aluno" | "visitante";
  onLogin: (profileType: "professor" | "aluno" | "visitante", data: any) => void;
  loading: boolean;
}

export const LoginForm = ({ selectedProfile, onLogin, loading }: LoginFormProps) => {
  const [emailAluno, setEmailAluno] = useState("");
  const [nomeVisitante, setNomeVisitante] = useState("");
  const [emailVisitante, setEmailVisitante] = useState("");
  const [emailProfessor, setEmailProfessor] = useState("");
  const [senhaProfessor, setSenhaProfessor] = useState("");
  const [lembrarMe, setLembrarMe] = useState(false);
  const { toast } = useToast();

  const validateStudentLogin = async (email: string) => {
    // Normalização ULTRA robusta do email
    const emailNormalizado = email
      .trim()
      .toLowerCase()
      .replace(/\s+/g, '')
      .replace(/[^\w@.-]/g, ''); // Remove caracteres especiais invisíveis

    console.log('🔍 VALIDAÇÃO - Email original:', email);
    console.log('🔍 VALIDAÇÃO - Email normalizado:', emailNormalizado);
    console.log('🔍 VALIDAÇÃO - Dispositivo:', navigator.userAgent);
    console.log('🔍 VALIDAÇÃO - Timestamp:', new Date().toISOString());

    try {
      // Query mais robusta com múltiplas tentativas
      const { data: aluno, error } = await supabase
        .from("profiles")
        .select("id, nome, email, turma")
        .eq("email", emailNormalizado)
        .eq("user_type", "aluno")
        .maybeSingle();

      console.log('🔍 VALIDAÇÃO - Resultado da query:', { aluno, error });

      if (error) {
        console.error('🚨 ERRO na consulta:', error);
        throw error;
      }

      if (!aluno) {
        // Tentativa de busca com ILIKE para casos edge
        console.log('🔍 VALIDAÇÃO - Tentando busca com ILIKE...');
        const { data: alunoIlike, error: errorIlike } = await supabase
          .from("profiles")
          .select("id, nome, email, turma")
          .ilike("email", emailNormalizado)
          .eq("user_type", "aluno")
          .maybeSingle();

        console.log('🔍 VALIDAÇÃO - Resultado ILIKE:', { alunoIlike, errorIlike });

        if (alunoIlike) {
          return alunoIlike;
        }

        // Buscar emails similares para ajudar o usuário
        const { data: emailsSimilares } = await supabase
          .from("profiles")
          .select("email, nome")
          .eq("user_type", "aluno")
          .ilike("email", `%${email.split('@')[0]}%`);
        
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
        return null;
      }

      console.log('✅ VALIDAÇÃO - Login bem-sucedido:', aluno.nome, 'Turma:', aluno.turma);
      return aluno;

    } catch (error: any) {
      console.error("🚨 ERRO na validação do aluno:", error);
      toast({
        title: "Erro na validação",
        description: "Ocorreu um erro ao verificar seus dados. Tente novamente.",
        variant: "destructive"
      });
      return null;
    }
  };

  const handleSubmit = async () => {
    if (selectedProfile === "aluno") {
      if (!emailAluno.trim()) {
        toast({
          title: "Campo obrigatório",
          description: "Por favor, digite seu e-mail.",
          variant: "destructive"
        });
        return;
      }

      const aluno = await validateStudentLogin(emailAluno);
      if (aluno) {
        onLogin("aluno", { turma: aluno.turma, nome: aluno.nome });
      }
    } else if (selectedProfile === "professor") {
      if (!emailProfessor || !senhaProfessor) {
        toast({
          title: "Campos obrigatórios",
          description: "Por favor, preencha email e senha.",
          variant: "destructive"
        });
        return;
      }
      onLogin("professor", { email: emailProfessor, senha: senhaProfessor });
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

      onLogin("visitante", { nome: nomeVisitante.trim(), email: emailVisitante.trim() });
    }
  };

  return (
    <Card className="shadow-xl border-redator-accent/20">
      <CardContent className="p-6 space-y-6">
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
              autoComplete="email"
              autoCapitalize="none"
              autoCorrect="off"
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
          onClick={handleSubmit}
          disabled={loading}
          className="w-full bg-redator-primary hover:bg-redator-primary/90 text-white h-12"
        >
          {loading ? 'Entrando...' : 'Entrar'}
        </Button>
      </CardContent>
    </Card>
  );
};
