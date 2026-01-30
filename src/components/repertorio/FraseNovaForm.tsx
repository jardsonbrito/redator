import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { EIXOS_TEMATICOS, EixoTematico, getEixoColors } from "@/utils/eixoTematicoCores";
import { cn } from "@/lib/utils";

interface FraseNovaFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (frase: string, eixo_tematico: EixoTematico) => void;
  initialData?: {
    frase: string;
    eixo_tematico: EixoTematico;
  };
  isEditing?: boolean;
  isSubmitting?: boolean;
}

const MIN_LENGTH = 10;
const MAX_LENGTH = 300;

export const FraseNovaForm = ({
  open,
  onOpenChange,
  onSubmit,
  initialData,
  isEditing = false,
  isSubmitting = false,
}: FraseNovaFormProps) => {
  const [frase, setFrase] = useState("");
  const [eixoTematico, setEixoTematico] = useState<EixoTematico | "">("");

  // Reset form quando abrir/fechar ou mudar initialData
  useEffect(() => {
    if (open) {
      setFrase(initialData?.frase || "");
      setEixoTematico(initialData?.eixo_tematico || "");
    }
  }, [open, initialData]);

  const charCount = frase.length;
  const isValidLength = charCount >= MIN_LENGTH && charCount <= MAX_LENGTH;
  const isValid = isValidLength && eixoTematico !== "";

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isValid && eixoTematico) {
      onSubmit(frase.trim(), eixoTematico as EixoTematico);
    }
  };

  const selectedEixoColors = eixoTematico ? getEixoColors(eixoTematico) : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Editar Frase" : "Nova Frase"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Seletor de Eixo Temático */}
          <div className="space-y-2">
            <Label htmlFor="eixo">Eixo Temático</Label>
            <Select
              value={eixoTematico}
              onValueChange={(value) => setEixoTematico(value as EixoTematico)}
            >
              <SelectTrigger id="eixo">
                <SelectValue placeholder="Selecione o eixo temático" />
              </SelectTrigger>
              <SelectContent>
                {EIXOS_TEMATICOS.map((eixo) => {
                  const colors = getEixoColors(eixo);
                  return (
                    <SelectItem key={eixo} value={eixo}>
                      <div className="flex items-center gap-2">
                        <div className={cn("w-3 h-3 rounded-full", colors.text.replace('text-', 'bg-'))} />
                        {eixo}
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>

            {/* Preview do eixo selecionado */}
            {selectedEixoColors && (
              <Badge className={cn("text-xs", selectedEixoColors.bg, selectedEixoColors.text)}>
                {eixoTematico}
              </Badge>
            )}
          </div>

          {/* Campo da frase */}
          <div className="space-y-2">
            <Label htmlFor="frase">Frase</Label>
            <Textarea
              id="frase"
              placeholder="Digite uma frase curta com repertório sociocultural..."
              value={frase}
              onChange={(e) => setFrase(e.target.value)}
              className={cn(
                "min-h-[120px] resize-none",
                !isValidLength && charCount > 0 && "border-red-300 focus:border-red-500"
              )}
              maxLength={MAX_LENGTH + 50} // Permite digitar um pouco além para mostrar erro
            />
            <div className="flex justify-between items-center">
              <p className="text-xs text-muted-foreground">
                {MIN_LENGTH}-{MAX_LENGTH} caracteres
              </p>
              <p className={cn(
                "text-xs",
                charCount < MIN_LENGTH && "text-amber-600",
                charCount > MAX_LENGTH && "text-red-600",
                isValidLength && "text-green-600"
              )}>
                {charCount}/{MAX_LENGTH}
              </p>
            </div>
          </div>

          {/* Dicas */}
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-xs text-muted-foreground">
              <strong>Dica:</strong> Compartilhe uma frase com citação de autor, dado estatístico,
              referência histórica ou cultural que pode ser usada em redações.
            </p>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={!isValid || isSubmitting}>
              {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {isEditing ? "Salvar Alterações" : "Publicar Frase"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
