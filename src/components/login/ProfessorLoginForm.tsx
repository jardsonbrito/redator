
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Mail } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ProfessorLoginFormProps {
  onLogin: (data: { email: string }) => void;
  loading: boolean;
}

export const ProfessorLoginForm = ({ onLogin, loading }: ProfessorLoginFormProps) => {
  const [email, setEmail] = useState("");
  const { toast } = useToast();

  const handleSubmit = () => {
    if (!email) {
      toast({
        title: "Campo obrigatório",
        description: "Por favor, informe seu e-mail.",
        variant: "destructive"
      });
      return;
    }
    onLogin({ email });
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
            placeholder="Digite seu e-mail cadastrado"
            className="mt-1 border-redator-accent/30 pl-10"
            onKeyPress={(e) => e.key === 'Enter' && handleSubmit()}
          />
          <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
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
