
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCorretorAuth } from "@/hooks/useCorretorAuth";
import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";

export const CorretorLoginForm = () => {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [loading, setLoading] = useState(false);
  const { loginAsCorretor } = useCorretorAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !senha) {
      return;
    }

    setLoading(true);
    
    const { error } = await loginAsCorretor(email, senha);
    
    if (error) {
      console.error("Erro no login:", error);
    }
    
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-violet-100 flex items-center justify-center">
      <div className="w-full max-w-md p-4">
        <div className="mb-6">
          <Link to="/" className="flex items-center gap-2 text-redator-primary hover:text-redator-accent transition-colors">
            <ArrowLeft className="w-5 h-5" />
            <span>Voltar ao início</span>
          </Link>
        </div>
        
        <Card className="border-redator-accent/20">
          <CardHeader>
            <CardTitle className="text-center text-redator-primary">Acesso do Corretor</CardTitle>
            <p className="text-center text-sm text-redator-accent">
              Entre com suas credenciais de corretor
            </p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="email" className="text-redator-primary">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Digite seu email"
                  required
                  className="border-redator-accent/30 focus:border-redator-primary"
                />
              </div>
              <div>
                <Label htmlFor="senha" className="text-redator-primary">Senha</Label>
                <Input
                  id="senha"
                  type="password"
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  placeholder="Digite sua senha"
                  required
                  className="border-redator-accent/30 focus:border-redator-primary"
                />
              </div>
              
              <Button 
                type="submit" 
                className="w-full bg-redator-primary hover:bg-redator-primary/90 text-white" 
                disabled={loading}
              >
                {loading ? 'Entrando...' : 'Acessar'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
