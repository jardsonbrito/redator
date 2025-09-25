import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Copy, Check, ExternalLink } from "lucide-react";

interface AlunoSelfServiceModernProps {
  onSuccess: () => void;
}

const LinkTurmaBlock = ({
  turma,
  link,
  onCopy,
  onOpen,
  copied
}: {
  turma: string;
  link: string;
  onCopy: () => void;
  onOpen: () => void;
  copied: boolean;
}) => (
  <div className="border border-gray-200 rounded-xl p-5 mb-4">
    <Label className="text-base font-medium mb-3 block">{turma}</Label>

    <div className="flex gap-2 mb-3">
      <Input
        value={link}
        readOnly
        className="flex-1 text-sm"
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
        className="flex-1 bg-[#3F0077] text-white hover:bg-[#662F96]"
        size="sm"
      >
        <Copy className="w-4 h-4 mr-2" />
        Copiar Link
      </Button>
      <Button
        onClick={onOpen}
        variant="outline"
        className="flex-1"
        size="sm"
      >
        <ExternalLink className="w-4 h-4 mr-2" />
        Abrir Link
      </Button>
    </div>
  </div>
);

export const AlunoSelfServiceModern = ({ onSuccess }: AlunoSelfServiceModernProps) => {
  const [copiado, setCopiado] = useState<{[key: string]: boolean}>({});
  const { toast } = useToast();

  const turmas = ["A", "B", "C", "D", "E"];

  // Link de troca de email
  const linkTrocaEmail = `${window.location.origin}/atualizar-email`;

  const handleCopiarLink = async (link: string, key: string) => {
    try {
      await navigator.clipboard.writeText(link);
      setCopiado(prev => ({ ...prev, [key]: true }));
      toast({
        title: "Link copiado!",
        description: "O link foi copiado para a área de transferência."
      });

      // Resetar o ícone após 2 segundos
      setTimeout(() => {
        setCopiado(prev => ({ ...prev, [key]: false }));
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
    <div className="space-y-6">
      {/* Links de Cadastro por TURMA */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Links de Cadastro por TURMA</h3>

        {turmas.map((turma) => {
          const link = `${window.location.origin}/cadastro-aluno?turma=${turma}`;
          const key = `turma-${turma}`;

          return (
            <LinkTurmaBlock
              key={turma}
              turma={`TURMA ${turma}`}
              link={link}
              onCopy={() => handleCopiarLink(link, key)}
              onOpen={() => handleAbrirLink(link)}
              copied={copiado[key] || false}
            />
          );
        })}
      </div>

      {/* Link de Troca de E-mail */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Link de Troca de E-mail</h3>

        <div className="border border-gray-200 rounded-xl p-5">
          <Label className="text-base font-medium mb-3 block">Link de Troca de E-mail</Label>

          <div className="flex gap-2 mb-3">
            <Input
              value={linkTrocaEmail}
              readOnly
              className="flex-1 text-sm"
            />
            <Button
              onClick={() => handleCopiarLink(linkTrocaEmail, 'troca-email')}
              variant="outline"
              size="icon"
              className="shrink-0"
            >
              {copiado['troca-email'] ? (
                <Check className="w-4 h-4 text-green-600" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
            </Button>
          </div>

          <div className="flex gap-2">
            <Button
              onClick={() => handleCopiarLink(linkTrocaEmail, 'troca-email')}
              className="flex-1 bg-[#3F0077] text-white hover:bg-[#662F96]"
              size="sm"
            >
              <Copy className="w-4 h-4 mr-2" />
              Copiar Link
            </Button>
            <Button
              onClick={() => handleAbrirLink(linkTrocaEmail)}
              variant="outline"
              className="flex-1"
              size="sm"
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              Abrir Link
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};