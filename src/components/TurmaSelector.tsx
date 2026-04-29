
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
  const { turmasDinamicas, turmasProfessores } = useTurmasAtivas();

  const handleTurmaChange = (valor: string, checked: boolean) => {
    if (checked) {
      onTurmasChange([...selectedTurmas, valor]);
    } else {
      onTurmasChange(selectedTurmas.filter(t => t !== valor));
    }
  };

  return (
    <div className="space-y-5">
      {/* Turmas de alunos */}
      {turmasDinamicas.length > 0 && (
        <div className="space-y-2">
          <Label className="text-sm font-semibold text-gray-700">Turmas de alunos</Label>
          <div className="grid grid-cols-2 gap-2">
            {turmasDinamicas.map(({ valor, label }) => (
              <div key={valor} className="flex items-center space-x-2">
                <Checkbox
                  id={`aluno-${valor}`}
                  checked={selectedTurmas.includes(valor)}
                  onCheckedChange={(checked) => handleTurmaChange(valor, !!checked)}
                />
                <Label htmlFor={`aluno-${valor}`} className="text-sm font-normal">
                  {label}
                </Label>
              </div>
            ))}
          </div>

          {onPermiteVisitanteChange && (
            <div className="flex items-center space-x-2 pt-2 mt-1 border-t border-dashed border-gray-200">
              <Checkbox
                id="permite-visitante"
                checked={permiteeVisitante}
                onCheckedChange={(checked) => onPermiteVisitanteChange(!!checked)}
              />
              <Label htmlFor="permite-visitante" className="text-sm font-normal text-gray-600">
                Permitir visitantes
              </Label>
            </div>
          )}
        </div>
      )}

      {/* Turmas de professores */}
      {turmasProfessores.length > 0 && (
        <div className="space-y-2">
          <Label className="text-sm font-semibold text-gray-700">Turmas de professores</Label>
          <div className="grid grid-cols-2 gap-2">
            {turmasProfessores.map(({ valor, label }) => (
              <div key={valor} className="flex items-center space-x-2">
                <Checkbox
                  id={`prof-${valor}`}
                  checked={selectedTurmas.includes(valor)}
                  onCheckedChange={(checked) => handleTurmaChange(valor, !!checked)}
                />
                <Label htmlFor={`prof-${valor}`} className="text-sm font-normal">
                  {label}
                </Label>
              </div>
            ))}
          </div>
        </div>
      )}

      {turmasDinamicas.length === 0 && turmasProfessores.length === 0 && (
        <p className="text-sm text-gray-400">Nenhuma turma ativa encontrada.</p>
      )}

      {/* Fallback: Permite visitante quando não há turmas de alunos mas o prop é fornecido */}
      {onPermiteVisitanteChange && turmasDinamicas.length === 0 && (
        <div className="flex items-center space-x-2 pt-2 border-t">
          <Checkbox
            id="permite-visitante-fb"
            checked={permiteeVisitante}
            onCheckedChange={(checked) => onPermiteVisitanteChange(!!checked)}
          />
          <Label htmlFor="permite-visitante-fb" className="text-sm font-normal text-gray-600">
            Permitir visitantes
          </Label>
        </div>
      )}
    </div>
  );
};
