import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useProfessorAuth } from "@/hooks/useProfessorAuth";
import { useToast } from "@/hooks/use-toast";
import { Lock, AlertTriangle } from "lucide-react";

export const TrocarSenhaProfessor = () => {
  const [novaSenha, setNovaSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [loading, setLoading] = useState(false);
  const { professor, trocarSenha } = useProfessorAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    // Se não estiver logado ou não for primeiro login, redirecionar
    if (!professor) {
      navigate('/professor/login');
    } else if (!professor.primeiro_login) {
      navigate('/professor/dashboard');
    }
  }, [professor, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!novaSenha || !confirmarSenha) {
      toast({
        title: "Campos obrigatórios",
        description: "Por favor, preencha todos os campos.",
        variant: "destructive"
      });
      return;
    }

    if (novaSenha !== confirmarSenha) {
      toast({
        title: "Senhas não conferem",
        description: "As senhas digitadas não são iguais.",
        variant: "destructive"
      });
      return;
    }

    if (novaSenha.length < 6) {
      toast({
        title: "Senha muito simples",
        description: "A senha deve ter pelo menos 6 caracteres.",
        variant: "destructive"
      });
      return;
    }

    if (novaSenha === "123456") {
      toast({
        title: "Senha inválida",
        description: "Por favor, escolha uma senha diferente da padrão.",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);

    try {
      const result = await trocarSenha(novaSenha);
      
      if (result.error) {
        toast({
          title: "Erro ao trocar senha",
          description: result.error,
          variant: "destructive"
        });
      } else {
        toast({
          title: "Senha alterada",
          description: "Sua senha foi alterada com sucesso! Redirecionando..."
        });
        
        setTimeout(() => {
          navigate('/professor/dashboard');
        }, 2000);
      }
    } catch (error) {
      console.error('Erro ao trocar senha:', error);
      toast({
        title: "Erro",
        description: "Ocorreu um erro inesperado. Tente novamente.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  if (!professor) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-secondary/10 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <div className="flex justify-center">
            <div className="p-3 bg-orange-100 rounded-full">
              <AlertTriangle className="w-8 h-8 text-orange-600" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-primary">Trocar Senha</h1>
          <p className="text-muted-foreground">
            É obrigatório trocar a senha padrão no primeiro acesso
          </p>
        </div>

        <Card className="border-orange-200 shadow-lg">
          <CardHeader className="text-center pb-4">
            <CardTitle className="text-orange-600">Primeira vez no sistema</CardTitle>
            <p className="text-sm text-muted-foreground">
              Olá, <strong>{professor.nome_completo}</strong>! 
              Por segurança, você deve criar uma nova senha.
            </p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="nova-senha" className="text-sm font-medium">
                  Nova Senha *
                </Label>
                <div className="relative">
                  <Input
                    id="nova-senha"
                    type="password"
                    value={novaSenha}
                    onChange={(e) => setNovaSenha(e.target.value)}
                    placeholder="Digite sua nova senha"
                    className="mt-1 pl-10"
                    required
                  />
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                </div>
              </div>
              
              <div>
                <Label htmlFor="confirmar-senha" className="text-sm font-medium">
                  Confirmar Nova Senha *
                </Label>
                <div className="relative">
                  <Input
                    id="confirmar-senha"
                    type="password"
                    value={confirmarSenha}
                    onChange={(e) => setConfirmarSenha(e.target.value)}
                    placeholder="Digite novamente a nova senha"
                    className="mt-1 pl-10"
                    required
                  />
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                </div>
              </div>

              <div className="text-xs text-muted-foreground bg-muted/50 p-3 rounded">
                <strong>Requisitos da senha:</strong>
                <ul className="list-disc list-inside mt-1 space-y-1">
                  <li>Mínimo de 6 caracteres</li>
                  <li>Diferente da senha padrão (123456)</li>
                  <li>Recomendado: use letras, números e símbolos</li>
                </ul>
              </div>

              <Button 
                type="submit" 
                disabled={loading}
                className="w-full bg-orange-600 hover:bg-orange-700 text-white"
              >
                {loading ? 'Alterando senha...' : 'Alterar Senha e Continuar'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};