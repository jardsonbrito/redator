import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Mail, Home, CheckCircle } from "lucide-react";
import { Link } from "react-router-dom";

export default function AtualizarEmail() {
  const [emailAtual, setEmailAtual] = useState("");
  const [novoEmail, setNovoEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [atualizado, setAtualizado] = useState(false);
  const { toast } = useToast();

  const isFormValid = emailAtual.trim() && novoEmail.trim();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid) return;

    setLoading(true);
    try {
      // Verificar se o e-mail atual existe no banco de dados
      const { data: existingUser } = await supabase
        .from("profiles")
        .select("id, email, nome")
        .eq("email", emailAtual.trim().toLowerCase())
        .maybeSingle();

      if (!existingUser) {
        toast({
          title: "E-mail não encontrado",
          description: "E-mail não encontrado no sistema. Verifique se digitou corretamente.",
          variant: "destructive"
        });
        setLoading(false);
        return;
      }

      // Verificar se o novo e-mail já está em uso
      const { data: emailInUse } = await supabase
        .from("profiles")
        .select("email")
        .eq("email", novoEmail.trim().toLowerCase())
        .maybeSingle();

      if (emailInUse) {
        toast({
          title: "E-mail já em uso",
          description: "O novo e-mail já está sendo usado por outro aluno.",
          variant: "destructive"
        });
        setLoading(false);
        return;
      }

      // Atualizar o e-mail do aluno
      const { error } = await supabase
        .from("profiles")
        .update({ 
          email: novoEmail.trim().toLowerCase(),
          updated_at: new Date().toISOString()
        })
        .eq("id", existingUser.id);

      if (error) throw error;

      setAtualizado(true);
      toast({
        title: "E-mail atualizado com sucesso!",
        description: "Seu e-mail foi atualizado com sucesso!"
      });

    } catch (error: any) {
      console.error("Erro ao atualizar e-mail:", error);
      toast({
        title: "Erro na atualização",
        description: error.message || "Ocorreu um erro inesperado. Tente novamente.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  if (atualizado) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-secondary/20 via-secondary/10 to-secondary/5 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <CheckCircle className="w-16 h-16 text-primary" />
            </div>
            <CardTitle className="text-2xl text-primary">E-mail Atualizado!</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-muted-foreground">
              Seu e-mail foi atualizado com sucesso!
            </p>
            <Link to="/">
              <Button className="w-full">
                <Home className="w-4 h-4 mr-2" />
                Voltar ao Início
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-secondary/20 via-secondary/10 to-secondary/5 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <Mail className="w-12 h-12 text-primary" />
          </div>
          <CardTitle className="text-2xl text-primary">Atualizar E-mail</CardTitle>
          <p className="text-muted-foreground">
            Preencha os campos abaixo para atualizar seu e-mail cadastrado
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="emailAtual">E-mail Atual *</Label>
              <Input
                id="emailAtual"
                type="email"
                value={emailAtual}
                onChange={(e) => setEmailAtual(e.target.value)}
                placeholder="Digite seu e-mail atual"
                required
              />
            </div>

            <div>
              <Label htmlFor="novoEmail">Novo E-mail *</Label>
              <Input
                id="novoEmail"
                type="email"
                value={novoEmail}
                onChange={(e) => setNovoEmail(e.target.value)}
                placeholder="Digite seu novo e-mail"
                required
              />
            </div>

            <Button 
              type="submit" 
              disabled={!isFormValid || loading}
              className="w-full"
            >
              {loading ? "Atualizando..." : "Atualizar E-mail"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}