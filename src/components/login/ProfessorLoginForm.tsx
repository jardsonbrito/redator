
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Lock, Mail } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ProfessorLoginFormProps {
  onLogin: (data: { email: string; senha: string }) => void;
  loading: boolean;
}

export const ProfessorLoginForm = ({ onLogin, loading }: ProfessorLoginFormProps) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { toast } = useToast();

  const handleSubmit = () => {
    if (!email || !password) {
      toast({
        title: "Campos obrigatórios",
        description: "Por favor, preencha email e senha.",
        variant: "destructive"
      });
      return;
    }
    onLogin({ email, senha: password });
  };

  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="professor-email" className="text-redator-primary font-medium">
          E-mail
        </Label>
        <div className="relative">
          <Input
            id="professor-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Digite seu e-mail"
            className="mt-1 border-redator-accent/30 pl-10"
          />
          <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
        </div>
      </div>
      
      <div>
        <Label htmlFor="professor-password" className="text-redator-primary font-medium">
          Senha
        </Label>
        <div className="relative">
          <Input
            id="professor-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Digite sua senha"
            className="mt-1 border-redator-accent/30 pl-10"
            onKeyPress={(e) => e.key === 'Enter' && handleSubmit()}
          />
          <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
        </div>
      </div>

      <Button 
        onClick={handleSubmit}
        disabled={loading}
        className="w-full bg-redator-primary hover:bg-redator-primary/90 text-white h-12"
      >
        {loading ? 'Entrando...' : 'Entrar'}
      </Button>
    </div>
  );
};
