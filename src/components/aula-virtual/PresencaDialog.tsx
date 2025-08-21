
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LogIn, LogOut } from "lucide-react";

interface PresencaDialogProps {
  tipo: 'entrada' | 'saida';
  aulaId: string;
  jaRegistrou: boolean;
  openDialog: {tipo: 'entrada' | 'saida', aulaId: string} | null;
  onOpenChange: (open: boolean) => void;
  onOpenPresencaDialog: (tipo: 'entrada' | 'saida', aulaId: string) => void;
  formData: { nome: string; sobrenome: string };
  onFormDataChange: (field: 'nome' | 'sobrenome', value: string) => void;
  onRegistrarPresenca: (tipo: 'entrada' | 'saida', aulaId: string) => void;
}

export const PresencaDialog = ({
  tipo,
  aulaId,
  jaRegistrou,
  openDialog,
  onOpenChange,
  onOpenPresencaDialog,
  formData,
  onFormDataChange,
  onRegistrarPresenca
}: PresencaDialogProps) => {
  const isOpen = openDialog?.tipo === tipo && openDialog?.aulaId === aulaId;
  const Icon = tipo === 'entrada' ? LogIn : LogOut;
  const label = tipo === 'entrada' ? 'Entrada' : 'Saída';

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button 
          variant="outline" 
          size="sm"
          disabled={jaRegistrou}
          onClick={() => onOpenPresencaDialog(tipo, aulaId)}
          className="w-full"
          aria-label={`${jaRegistrou ? `${label} já registrada` : `Registrar ${label} na aula`}`}
        >
          <Icon className="w-4 h-4 mr-2" />
          {jaRegistrou ? `${label} Registrada` : `Registrar ${label}`}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Registrar {label} na Aula</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="nome">Nome</Label>
            <Input
              id="nome"
              value={formData.nome}
              onChange={(e) => onFormDataChange('nome', e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="sobrenome">Sobrenome</Label>
            <Input
              id="sobrenome"
              value={formData.sobrenome}
              onChange={(e) => onFormDataChange('sobrenome', e.target.value)}
            />
          </div>
          <Button 
            onClick={() => onRegistrarPresenca(tipo, aulaId)}
            className="w-full"
            disabled={!formData.nome.trim()}
          >
            Confirmar {label}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
