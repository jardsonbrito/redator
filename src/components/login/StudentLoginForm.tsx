
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Mail } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface StudentLoginFormProps {
  onLogin: (data: { turma: string; nome: string }) => void;
  loading: boolean;
}

export const StudentLoginForm = ({ onLogin, loading }: StudentLoginFormProps) => {
  const [email, setEmail] = useState("");
  const { toast } = useToast();

  const validateAndLogin = async () => {
    if (!email.trim()) {
      toast({
        title: "Campo obrigatório",
        description: "Por favor, digite seu e-mail.",
        variant: "destructive"
      });
      return;
    }

    // Normalização ULTRA robusta do email
    const normalizedEmail = email
      .trim()
      .toLowerCase()
      .replace(/\s+/g, '')
      .replace(/[^\w@.-]/g, '');

    console.log('🔍 DIAGNÓSTICO LOGIN - Iniciando validação');
    console.log('📧 Email original:', email);
    console.log('📧 Email normalizado:', normalizedEmail);
    console.log('🕒 Timestamp:', new Date().toISOString());
    console.log('📱 User Agent:', navigator.userAgent);

    try {
      // Primeira tentativa: busca exata
      console.log('🔄 Tentativa 1: Busca exata');
      const { data: student, error } = await supabase
        .from("profiles")
        .select("id, nome, email, turma")
        .eq("email", normalizedEmail)
        .eq("user_type", "aluno")
        .maybeSingle();

      console.log('📊 Resultado busca exata:', { student, error });

      if (error) {
        console.error('🚨 ERRO na consulta:', error);
        throw error;
      }

      if (student) {
        console.log('✅ SUCESSO - Aluno encontrado:', student.nome, 'Turma:', student.turma);
        onLogin({ turma: student.turma, nome: student.nome });
        return;
      }

      // Segunda tentativa: busca com ILIKE (case insensitive)
      console.log('🔄 Tentativa 2: Busca com ILIKE');
      const { data: studentIlike, error: errorIlike } = await supabase
        .from("profiles")
        .select("id, nome, email, turma")
        .ilike("email", normalizedEmail)
        .eq("user_type", "aluno")
        .maybeSingle();

      console.log('📊 Resultado ILIKE:', { studentIlike, errorIlike });

      if (studentIlike) {
        console.log('✅ SUCESSO ILIKE - Aluno encontrado:', studentIlike.nome);
        onLogin({ turma: studentIlike.turma, nome: studentIlike.nome });
        return;
      }

      // Terceira tentativa: busca por padrão similar
      console.log('🔄 Tentativa 3: Busca por padrão similar');
      const emailPrefix = normalizedEmail.split('@')[0];
      const { data: similarEmails } = await supabase
        .from("profiles")
        .select("email, nome, turma")
        .eq("user_type", "aluno")
        .ilike("email", `%${emailPrefix}%`)
        .limit(3);

      console.log('📊 Emails similares encontrados:', similarEmails);

      // Se não encontrou nada, mostrar erro com sugestões
      let errorDescription = "Verifique se você foi cadastrado pelo professor ou se o e-mail está correto.";
      
      if (similarEmails && similarEmails.length > 0) {
        const suggestion = similarEmails[0].email;
        errorDescription = `E-mail não encontrado. Você quis dizer: ${suggestion}?`;
      }

      toast({
        title: "E-mail não encontrado",
        description: errorDescription,
        variant: "destructive"
      });

    } catch (error: any) {
      console.error("🚨 ERRO CRÍTICO na validação:", error);
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
            onKeyPress={(e) => e.key === 'Enter' && validateAndLogin()}
          />
          <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
        </div>
        <p className="text-xs text-gray-500 mt-1">
          Use o e-mail que foi cadastrado pelo professor
        </p>
      </div>

      <Button 
        onClick={validateAndLogin}
        disabled={loading}
        className="w-full bg-redator-primary hover:bg-redator-primary/90 text-white h-12"
      >
        {loading ? 'Verificando...' : 'Entrar'}
      </Button>
    </div>
  );
};
