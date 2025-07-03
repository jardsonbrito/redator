
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Mail, User } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface VisitorLoginFormProps {
  onLogin: (data: { nome: string; email: string }) => void;
  loading: boolean;
}

export const VisitorLoginForm = ({ onLogin, loading }: VisitorLoginFormProps) => {
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const { toast } = useToast();

  const handleSubmit = () => {
    if (!nome.trim() || !email.trim()) {
      toast({
        title: "Preencha todos os campos",
        description: "Nome e e-mail são obrigatórios.",
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

    onLogin({ nome: nome.trim(), email: email.trim() });
  };

  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="visitor-name" className="text-redator-primary font-medium">
          Nome Completo
        </Label>
        <div className="relative">
          <Input
            id="visitor-name"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            placeholder="Digite seu nome completo"
            className="mt-1 border-redator-accent/30 pl-10"
          />
          <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
        </div>
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
