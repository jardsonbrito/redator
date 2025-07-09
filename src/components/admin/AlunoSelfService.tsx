import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Copy, Check, ExternalLink } from "lucide-react";

interface AlunoSelfServiceProps {
  onSuccess: () => void;
}

const LinkBlock = ({ 
  title, 
  link, 
  onCopy, 
  onOpen, 
  copied 
}: { 
  title: string; 
  link: string; 
  onCopy: () => void; 
  onOpen: () => void; 
  copied: boolean; 
}) => (
  <Card className="flex-1">
    <CardHeader className="pb-3">
      <CardTitle className="text-lg">{title}</CardTitle>
    </CardHeader>
    <CardContent className="space-y-3">
      <div className="flex gap-2">
        <Input
          value={link}
          readOnly
          className="flex-1"
        />
        <Button
          onClick={onCopy}
          variant="outline"
          size="icon"
          className="shrink-0"
        >
          {copied ? (
            <Check className="w-4 h-4 text-green-600" />
          ) : (
            <Copy className="w-4 h-4" />
          )}
        </Button>
      </div>
      
      <div className="flex gap-2">
        <Button
          onClick={onCopy}
          className="flex-1"
          variant="default"
        >
          <Copy className="w-4 h-4 mr-2" />
          Copiar Link
        </Button>
        <Button
          onClick={onOpen}
          variant="outline"
          className="flex-1"
        >
          <ExternalLink className="w-4 h-4 mr-2" />
          Abrir Link
        </Button>
      </div>
    </CardContent>
  </Card>
);

export const AlunoSelfService = ({ onSuccess }: AlunoSelfServiceProps) => {
  const [copiado1, setCopiado1] = useState(false);
  const [copiado2, setCopiado2] = useState(false);
  const { toast } = useToast();

  // Links de autoatendimento
  const linkCadastro = `${window.location.origin}/cadastro-aluno`;
  const linkTrocaEmail = `${window.location.origin}/atualizar-email`;

  const handleCopiarLink = async (link: string, setCopied: (value: boolean) => void) => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      toast({
        title: "Link copiado!",
        description: "O link foi copiado para a área de transferência."
      });
      
      // Resetar o ícone após 2 segundos
      setTimeout(() => {
        setCopied(false);
      }, 2000);
    } catch (error) {
      toast({
        title: "Erro ao copiar",
        description: "Não foi possível copiar o link. Tente novamente.",
        variant: "destructive"
      });
    }
  };

  const handleAbrirLink = (link: string) => {
    window.open(link, '_blank');
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <LinkBlock
          title="Link de Cadastro"
          link={linkCadastro}
          onCopy={() => handleCopiarLink(linkCadastro, setCopiado1)}
          onOpen={() => handleAbrirLink(linkCadastro)}
          copied={copiado1}
        />
        
        <LinkBlock
          title="Link de Troca de E-mail"
          link={linkTrocaEmail}
          onCopy={() => handleCopiarLink(linkTrocaEmail, setCopiado2)}
          onOpen={() => handleAbrirLink(linkTrocaEmail)}
          copied={copiado2}
        />
      </div>
    </div>
  );
};