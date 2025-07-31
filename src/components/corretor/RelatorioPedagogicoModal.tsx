import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

interface RelatorioPedagogicoModalProps {
  isOpen: boolean;
  onClose: () => void;
  value: string;
  onChange: (value: string) => void;
  alunoNome: string;
  fraseTematica: string;
}

export const RelatorioPedagogicoModal = ({
  isOpen,
  onClose,
  value,
  onChange,
  alunoNome,
  fraseTematica
}: RelatorioPedagogicoModalProps) => {
  const [localValue, setLocalValue] = useState(value);

  const handleClose = () => {
    // Salvar automaticamente ao fechar
    onChange(localValue);
    onClose();
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      handleClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-4xl w-full h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">
            Relatório Pedagógico de Correção - {alunoNome}
          </DialogTitle>
        </DialogHeader>
        
        <div className="flex-1 flex flex-col space-y-4">
          <div className="text-sm text-muted-foreground">
            <strong>Tema:</strong> {fraseTematica}
          </div>
          
          <Textarea
            value={localValue}
            onChange={(e) => setLocalValue(e.target.value)}
            placeholder="Digite aqui seu relatório pedagógico completo para o aluno..."
            className="flex-1 resize-none min-h-[400px]"
          />
          
          <div className="flex justify-end">
            <Button onClick={handleClose}>
              Fechar e Salvar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};