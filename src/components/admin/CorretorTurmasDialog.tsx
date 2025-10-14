import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { TURMAS_VALIDAS, formatTurmaDisplay, type TurmaLetra } from "@/utils/turmaUtils";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface Corretor {
  id: string;
  nome_completo: string;
  turmas_autorizadas: string[] | null;
}

interface CorretorTurmasDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  corretor: Corretor;
  onSuccess: () => void;
}

export const CorretorTurmasDialog = ({
  open,
  onOpenChange,
  corretor,
  onSuccess,
}: CorretorTurmasDialogProps) => {
  const [selectedTurmas, setSelectedTurmas] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  // Inicializar com as turmas já autorizadas ou todas as turmas
  useEffect(() => {
    if (open) {
      if (corretor.turmas_autorizadas && corretor.turmas_autorizadas.length > 0) {
        setSelectedTurmas(corretor.turmas_autorizadas);
      } else {
        // Se não tem turmas autorizadas (NULL), marcar todas por padrão
        setSelectedTurmas([...TURMAS_VALIDAS]);
      }
    }
  }, [open, corretor]);

  const handleTurmaChange = (turma: TurmaLetra, checked: boolean) => {
    if (checked) {
      setSelectedTurmas([...selectedTurmas, turma]);
    } else {
      setSelectedTurmas(selectedTurmas.filter((t) => t !== turma));
    }
  };

  const handleTodasTurmasChange = (checked: boolean) => {
    if (checked) {
      setSelectedTurmas([...TURMAS_VALIDAS]);
    } else {
      setSelectedTurmas([]);
    }
  };

  const handleSave = async () => {
    if (selectedTurmas.length === 0) {
      toast({
        title: "Atenção",
        description: "Selecione pelo menos uma turma ou todas as turmas.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      // Atualizar corretor como disponível e com as turmas autorizadas
      const { error } = await supabase
        .from("corretores")
        .update({
          visivel_no_formulario: true,
          turmas_autorizadas: selectedTurmas,
        })
        .eq("id", corretor.id);

      if (error) throw error;

      const isTodasTurmas = selectedTurmas.length === TURMAS_VALIDAS.length;
      toast({
        title: "Disponibilidade atualizada!",
        description: `Corretor agora está disponível para ${
          isTodasTurmas ? "todas as turmas" : `${selectedTurmas.length} turma(s)`
        }.`,
      });

      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error("Erro ao atualizar disponibilidade:", error);
      toast({
        title: "Erro ao atualizar disponibilidade",
        description: error.message || "Ocorreu um erro inesperado.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const todasSelecionadas = selectedTurmas.length === TURMAS_VALIDAS.length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Tornar Corretor Disponível</DialogTitle>
          <DialogDescription>
            Selecione as turmas para as quais o corretor <strong>{corretor.nome_completo}</strong>{" "}
            estará disponível.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-3">
            <div className="flex items-center space-x-2 pb-2 border-b">
              <Checkbox
                id="todas-turmas"
                checked={todasSelecionadas}
                onCheckedChange={handleTodasTurmasChange}
              />
              <Label htmlFor="todas-turmas" className="font-semibold text-base cursor-pointer">
                Todas as turmas
              </Label>
            </div>

            <div className="grid grid-cols-2 gap-2 ml-2">
              {TURMAS_VALIDAS.map((turma) => (
                <div key={turma} className="flex items-center space-x-2">
                  <Checkbox
                    id={`turma-${turma}`}
                    checked={selectedTurmas.includes(turma)}
                    onCheckedChange={(checked) => handleTurmaChange(turma, !!checked)}
                  />
                  <Label htmlFor={`turma-${turma}`} className="text-sm cursor-pointer">
                    {formatTurmaDisplay(turma)}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          <div className="text-sm text-muted-foreground pt-2 border-t">
            {selectedTurmas.length === 0 ? (
              <p>Nenhuma turma selecionada</p>
            ) : (
              <p>
                {selectedTurmas.length} turma{selectedTurmas.length !== 1 ? "s" : ""} selecionada
                {selectedTurmas.length !== 1 ? "s" : ""}
              </p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={loading}>
            {loading ? "Salvando..." : "Confirmar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
