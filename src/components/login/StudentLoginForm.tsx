
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Mail } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { normalizeEmail, logLoginAttempt } from "@/utils/emailNormalizer";

interface StudentLoginFormProps {
  onLogin: (data: { turma: string; nome: string }) => void;
  loading: boolean;
}

export const StudentLoginForm = ({ onLogin, loading }: StudentLoginFormProps) => {
  const [email, setEmail] = useState("");
  const { toast } = useToast();

  const handleLogin = async () => {
    if (!email.trim()) {
      toast({
        title: "Campo obrigatório",
        description: "Por favor, digite seu e-mail.",
        variant: "destructive"
      });
      return;
    }

    // Normalização do e-mail conforme especificação
    const emailNormalizado = normalizeEmail(email);

    try {
      // Consulta SQL conforme especificação: SELECT * FROM profiles WHERE LOWER(TRIM(email)) = email_normalizado
      const { data: aluno, error } = await supabase
        .from("profiles")
        .select("id, nome, email, turma")
        .eq("user_type", "aluno")
        .ilike("email", emailNormalizado)
        .limit(1)
        .maybeSingle();

      if (error) {
        logLoginAttempt(email, emailNormalizado, 'error');
        console.error('🚨 ERRO na consulta:', error);
        toast({
          title: "Erro no sistema",
          description: "Ocorreu um erro ao verificar seus dados. Tente novamente.",
          variant: "destructive"
        });
        return;
      }

      if (aluno) {
        logLoginAttempt(email, emailNormalizado, 'success');
        console.log('✅ LOGIN SUCESSO - Aluno:', aluno.nome, 'Turma:', aluno.turma);
        onLogin({ turma: aluno.turma, nome: aluno.nome });
        return;
      }

      // Nenhum resultado encontrado
      logLoginAttempt(email, emailNormalizado, 'not_found');
      toast({
        title: "E-mail não encontrado",
        description: "E-mail não encontrado. Verifique se você foi cadastrado corretamente pelo professor.",
        variant: "destructive"
      });

    } catch (error: any) {
      logLoginAttempt(email, emailNormalizado, 'error');
      console.error("🚨 ERRO CRÍTICO:", error);
      toast({
        title: "Erro na validação",
        description: "Ocorreu um erro ao verificar seus dados. Tente novamente.",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="student-email" className="text-redator-primary font-medium">
          E-mail
        </Label>
        <div className="relative">
          <Input
            id="student-email"
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
          <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
        </div>
        <p className="text-xs text-gray-500 mt-1">
          Use o e-mail que foi cadastrado pelo professor
        </p>
      </div>

      <Button 
        onClick={handleLogin}
        disabled={loading}
        className="w-full bg-redator-primary hover:bg-redator-primary/90 text-white h-12"
      >
        {loading ? 'Verificando...' : 'Entrar'}
      </Button>
    </div>
  );
};
