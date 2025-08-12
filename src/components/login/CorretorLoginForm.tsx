import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Mail } from "lucide-react";
interface CorretorLoginFormProps {
  onLogin: (data: {
    email: string;
  }) => void;
  loading: boolean;
}
export const CorretorLoginForm = ({
  onLogin,
  loading
}: CorretorLoginFormProps) => {
  const [email, setEmail] = useState("");
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email.trim()) {
      onLogin({
        email: email.trim()
      });
    }
  };
  return <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="corretor-email" className="text-redator-primary">
          E-mail do(a) Corretor(a)
        </Label>
        <div className="relative">
          <Mail className="absolute left-3 top-3 h-4 w-4 text-redator-accent" />
          <Input id="corretor-email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Digite seu e-mail de corretor(a)" className="pl-10 border-redator-accent/30 focus:border-redator-primary" required />
        </div>
        <p className="text-xs text-redator-accent mt-1"></p>
      </div>
      
      <Button type="submit" className="w-full bg-redator-primary hover:bg-redator-primary/90 text-white" disabled={loading}>
        {loading ? "Verificando..." : "Acessar Painel"}
      </Button>
    </form>;
};