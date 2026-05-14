import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Mail } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { normalizeEmail, logLoginAttempt } from "@/utils/emailNormalizer";
interface StudentLoginFormProps {
  onLogin: (data: {
    turma: string;
    nome: string;
    email: string;
  }) => void;
  loading: boolean;
}
export const StudentLoginForm = ({
  onLogin,
  loading
}: StudentLoginFormProps) => {
  const [email, setEmail] = useState("");
  const {
    toast
  } = useToast();
  const handleLogin = async () => {
    console.log('🔄 StudentLoginForm - handleLogin iniciado, email:', email);
    
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
      // Use secure function for login validation instead of direct database query
      const { data, error } = await supabase.rpc('validate_student_login' as any, {
        p_email: emailNormalizado
      });

      if (error) {
        logLoginAttempt(email, emailNormalizado, 'error');
        console.error('🚨 ERRO na validação:', error);
        toast({
          title: "Erro no sistema",
          description: "Ocorreu um erro ao verificar seus dados. Tente novamente.",
          variant: "destructive"
        });
        return;
      }

      // Type assertion for the JSON response
      const result = data as { success: boolean; student?: any; message?: string };

      if (result?.success && result.student) {
        const aluno = result.student;
        logLoginAttempt(email, emailNormalizado, 'success');
        console.log('✅ LOGIN SUCESSO - Aluno:', aluno.nome, 'Turma:', aluno.turma);
        console.log('🔄 StudentLoginForm - Chamando onLogin, mantendo email:', email);
        
        // Successful login
        onLogin({
          turma: aluno.turma || '',
          nome: aluno.nome,
          email: aluno.email
        });
        
        console.log('✅ StudentLoginForm - onLogin executado, email ainda é:', email);
        return;
      }

      // Login failed - student not found or inactive
      logLoginAttempt(email, emailNormalizado, 'not_found');
      toast({
        title: "Acesso não autorizado",
        description: result?.message || "E-mail não encontrado ou conta inativa. Verifique se você foi cadastrado corretamente pelo professor.",
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
  return <div className="space-y-4">
      <div>
        <Label htmlFor="student-email" className="text-redator-primary font-medium">
          E-mail
        </Label>
        <div className="relative">
          <Input id="student-email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Digite seu e-mail cadastrado" className="mt-1 border-redator-accent/30 pl-10" autoComplete="email" autoCapitalize="none" autoCorrect="off" onKeyPress={e => e.key === 'Enter' && handleLogin()} />
          <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
        </div>
        <p className="text-xs text-gray-500 mt-1"></p>
      </div>

      <Button onClick={handleLogin} disabled={loading} className="w-full bg-violet-600 hover:bg-violet-700 text-white h-12 rounded-xl font-semibold">
        {loading ? 'Verificando...' : 'Entrar'}
      </Button>
    </div>;
};