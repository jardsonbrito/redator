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
      const { data: resultado, error } = await supabase.rpc('descobrir_usuario_por_email', {
        p_email: email.trim()
      });

      if (error) {
        console.error('❌ Erro na verificação:', error);
        throw error;
      }

      console.log('✅ Resultado da verificação:', resultado);
      onEmailVerified(email.trim(), resultado);

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
          Acesso por E-mail
        </h3>
        <p className="text-sm text-redator-accent">
          Digite seu e-mail para continuar
        </p>
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