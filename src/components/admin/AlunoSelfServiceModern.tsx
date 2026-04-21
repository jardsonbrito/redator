import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Copy, Check, ExternalLink } from "lucide-react";

interface AlunoSelfServiceModernProps {
  onSuccess: () => void;
}

export const AlunoSelfServiceModern = ({ onSuccess }: AlunoSelfServiceModernProps) => {
  const [copiado, setCopiado] = useState(false);
  const { toast } = useToast();

  const linkTrocaEmail = `${window.location.origin}/atualizar-email`;

  const handleCopiarLink = async () => {
    try {
      await navigator.clipboard.writeText(linkTrocaEmail);
      setCopiado(true);
      toast({ title: "Link copiado!", description: "O link foi copiado para a área de transferência." });
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      toast({ title: "Erro ao copiar", description: "Não foi possível copiar o link.", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <Label className="text-base font-medium mb-3 block">Link de Troca de E-mail</Label>
        <p className="text-sm text-muted-foreground mb-3">
          Envie este link para alunos que precisam atualizar o e-mail cadastrado.
        </p>

        <div className="flex gap-2 mb-3">
          <Input value={linkTrocaEmail} readOnly className="flex-1 text-sm" />
          <Button onClick={handleCopiarLink} variant="outline" size="icon" className="shrink-0">
            {copiado ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
          </Button>
        </div>

        <div className="flex gap-2">
          <Button onClick={handleCopiarLink} className="flex-1 bg-[#3F0077] text-white hover:bg-[#662F96]" size="sm">
            <Copy className="w-4 h-4 mr-2" />
            Copiar Link
          </Button>
          <Button onClick={() => window.open(linkTrocaEmail, '_blank')} variant="outline" className="flex-1" size="sm">
            <ExternalLink className="w-4 h-4 mr-2" />
            Abrir Link
          </Button>
        </div>
      </div>
    </div>
  );
};
