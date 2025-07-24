import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ExternalLink } from "lucide-react";

interface UnlockModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  resourceName?: string;
}

export const UnlockModal = ({ open, onOpenChange, resourceName }: UnlockModalProps) => {
  const handleUpgrade = () => {
    const whatsappUrl = "https://wa.me/558592160605?text=Sou%20da%20Turma%20E%20e%20quero%20comprar%20o%20curso.";
    window.open(whatsappUrl, '_blank');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center">Recurso Bloqueado</DialogTitle>
          <DialogDescription className="text-center space-y-4">
            <p>
              Este recurso faz parte do curso completo.
            </p>
            <p>
              Compre o curso e tenha acesso total aos temas, vídeos, exercícios e correção de redações.
            </p>
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex flex-col gap-3 mt-6">
          <Button 
            onClick={handleUpgrade}
            className="w-full gap-2"
          >
            <ExternalLink size={16} />
            Quero acessar o curso completo
          </Button>
          
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)}
            className="w-full"
          >
            Fechar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};