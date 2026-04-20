
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useTurmasAtivas } from "@/hooks/useTurmasAtivas";

interface TurmaSelectorProps {
  selectedTurmas: string[];
  onTurmasChange: (turmas: string[]) => void;
  permiteeVisitante?: boolean;
  onPermiteVisitanteChange?: (permite: boolean) => void;
}

export const TurmaSelector = ({
  selectedTurmas,
  onTurmasChange,
  permiteeVisitante = false,
  onPermiteVisitanteChange
}: TurmaSelectorProps) => {
  const { turmasDinamicas } = useTurmasAtivas();

  const handleTurmaChange = (valor: string, checked: boolean) => {
    if (checked) {
      onTurmasChange([...selectedTurmas, valor]);
    } else {
      onTurmasChange(selectedTurmas.filter(t => t !== valor));
    }
  };

  const handleTodasTurmasChange = (checked: boolean) => {
    if (checked) {
      onTurmasChange(turmasDinamicas.map(t => t.valor));
    } else {
      onTurmasChange([]);
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label className="text-base font-medium">Turmas Autorizadas</Label>

        <div className="flex items-center space-x-2">
          <Checkbox
            id="todas-turmas"
            checked={turmasDinamicas.length > 0 && selectedTurmas.length === turmasDinamicas.length}
            onCheckedChange={handleTodasTurmasChange}
          />
          <Label htmlFor="todas-turmas" className="font-medium">
            Todas as turmas
          </Label>
        </div>

        <div className="grid grid-cols-2 gap-2 ml-6">
          {turmasDinamicas.map(({ valor, label }) => (
            <div key={valor} className="flex items-center space-x-2">
              <Checkbox
                id={valor}
                checked={selectedTurmas.includes(valor)}
                onCheckedChange={(checked) => handleTurmaChange(valor, !!checked)}
              />
              <Label htmlFor={valor} className="text-sm">
                {label}
              </Label>
            </div>
          ))}
        </div>
      </div>

      {onPermiteVisitanteChange && (
        <div className="flex items-center space-x-2 pt-2 border-t">
          <Checkbox
            id="permite-visitante"
            checked={permiteeVisitante}
            onCheckedChange={(checked) => onPermiteVisitanteChange(!!checked)}
          />
          <Label htmlFor="permite-visitante" className="font-medium">
            Permite visitante
          </Label>
        </div>
      )}
    </div>
  );
};
