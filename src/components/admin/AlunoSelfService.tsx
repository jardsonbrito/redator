import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Copy, Check, ExternalLink } from "lucide-react";

interface AlunoSelfServiceProps {
  onSuccess: () => void;
}

export const AlunoSelfService = ({ onSuccess }: AlunoSelfServiceProps) => {
  const [copiado, setCopiado] = useState(false);
  const { toast } = useToast();

  // Gerar o link de autoatendimento
  const linkAutoatendimento = `${window.location.origin}/cadastro-aluno`;

  const handleCopiarLink = async () => {
    try {
      await navigator.clipboard.writeText(linkAutoatendimento);
      setCopiado(true);
      toast({
        title: "Link copiado!",
        description: "O link de autoatendimento foi copiado para a área de transferência."
      });
      
      // Resetar o ícone após 2 segundos
      setTimeout(() => {
        setCopiado(false);
      }, 2000);
    } catch (error) {
      toast({
        title: "Erro ao copiar",
        description: "Não foi possível copiar o link. Tente novamente.",
        variant: "destructive"
      });
    }
  };

  const handleAbrirLink = () => {
    window.open(linkAutoatendimento, '_blank');
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Link de Autoatendimento</CardTitle>
        <p className="text-sm text-muted-foreground">
          Compartilhe este link com os alunos para que eles possam se cadastrar automaticamente no sistema.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label htmlFor="link">Link de Cadastro</Label>
          <div className="flex gap-2 mt-2">
            <Input
              id="link"
              value={linkAutoatendimento}
              readOnly
              className="flex-1"
            />
            <Button
              onClick={handleCopiarLink}
              variant="outline"
              size="icon"
              className="shrink-0"
            >
              {copiado ? (
                <Check className="w-4 h-4 text-green-600" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
            </Button>
          </div>
        </div>

        <div className="flex gap-2">
          <Button
            onClick={handleCopiarLink}
            className="flex-1"
            variant="default"
          >
            <Copy className="w-4 h-4 mr-2" />
            Copiar Link
          </Button>
          <Button
            onClick={handleAbrirLink}
            variant="outline"
            className="flex-1"
          >
            <ExternalLink className="w-4 h-4 mr-2" />
            Abrir Link
          </Button>
        </div>

        <div className="bg-muted/50 p-4 rounded-lg">
          <h4 className="font-semibold mb-2">Como usar:</h4>
          <ul className="text-sm space-y-1 text-muted-foreground">
            <li>1. Copie o link acima</li>
            <li>2. Envie para os alunos via WhatsApp, e-mail ou outro meio</li>
            <li>3. Os alunos preencherão o formulário de cadastro</li>
            <li>4. Você poderá editar os dados dos alunos posteriormente se necessário</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};