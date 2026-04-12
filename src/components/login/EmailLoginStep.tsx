import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Mail, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface EmailLoginStepProps {
  onEmailVerified: (email: string, userData: any) => void;
  loading: boolean;
}

export const EmailLoginStep = ({ onEmailVerified, loading }: EmailLoginStepProps) => {
  const [email, setEmail] = useState("");
  const [verifying, setVerifying] = useState(false);
  const { toast } = useToast();

  const handleContinue = async () => {
    if (!email.trim()) {
      toast({
        title: "Campo obrigatório",
        description: "Por favor, digite seu e-mail.",
        variant: "destructive"
      });
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast({
        title: "E-mail inválido", 
        description: "Por favor, insira um e-mail válido.",
        variant: "destructive"
      });
      return;
    }

    setVerifying(true);
    try {
      // Importar supabase dinamicamente para evitar problemas de SSR
      const { supabase } = await import('@/integrations/supabase/client');
      
      console.log('🔍 Verificando usuário por email:', email);
      
      // Verificar se o usuário existe
      const { data: studentExists, error } = await supabase
        .rpc('check_student_exists', { p_email: email.trim().toLowerCase() });

      if (error) {
        console.error('❌ Erro na verificação:', error);
        throw error;
      }

      console.log('✅ Resultado da verificação - usuário existe:', studentExists);
      
      // Sempre buscar dados de visitante, independente de ser aluno ou não
      let userData = null;
      
      // Buscar dados do visitante em sessões passadas
      try {
        const { data: sessaoData } = await supabase
          .from('visitante_sessoes')
          .select('nome_visitante, email_visitante')
          .eq('email_visitante', email.trim().toLowerCase())
          .eq('ativo', true)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (sessaoData) {
          console.log('✅ Visitante existente encontrado:', sessaoData);
          userData = {
            encontrado: true,
            tipo: 'visitante' as const,
            dados: {
              nome: sessaoData.nome_visitante,
              email: sessaoData.email_visitante
            }
          };
        } else {
          console.log('👤 Dados de visitante não encontrados - novo visitante');
          userData = {
            encontrado: false,
            tipo: 'novo' as const
          };
        }
      } catch (searchError) {
        console.warn('⚠️ Erro ao buscar dados do visitante:', searchError);
        // Em caso de erro, tratar como novo visitante
        userData = {
          encontrado: false,
          tipo: 'novo' as const
        };
      }

      onEmailVerified(email.trim(), userData);

    } catch (error: any) {
      console.error('❌ Erro ao verificar email:', error);
      toast({
        title: "Erro na verificação",
        description: "Ocorreu um erro ao verificar seu e-mail. Tente novamente.",
        variant: "destructive"
      });
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="text-center mb-6">
        <h3 className="text-lg font-semibold text-redator-primary mb-2">
          Acesso por e-mail
        </h3>
      </div>

      <div>
        <Label htmlFor="visitor-email" className="text-redator-primary font-medium">
          E-mail
        </Label>
        <div className="relative">
          <Input
            id="visitor-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Digite seu e-mail"
            className="mt-1 border-redator-accent/30 pl-10"
            onKeyPress={(e) => e.key === 'Enter' && !verifying && handleContinue()}
            disabled={verifying || loading}
          />
          <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
        </div>
      </div>

      <Button 
        onClick={handleContinue}
        disabled={verifying || loading}
        className="w-full bg-redator-primary hover:bg-redator-primary/90 text-white h-12"
      >
        {verifying ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Verificando...
          </>
        ) : (
          'Continuar →'
        )}
      </Button>
    </div>
  );
};