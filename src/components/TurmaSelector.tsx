
import { useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

const turmasDisponiveis = [
  "Turma A",
  "Turma B", 
  "Turma C",
  "Turma D",
  "Turma E"
];

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
  const handleTurmaChange = (turma: string, checked: boolean) => {
    if (checked) {
      onTurmasChange([...selectedTurmas, turma]);
    } else {
      onTurmasChange(selectedTurmas.filter(t => t !== turma));
    }
  };

  const handleTodasTurmasChange = (checked: boolean) => {
    if (checked) {
      onTurmasChange(turmasDisponiveis);
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
            checked={selectedTurmas.length === turmasDisponiveis.length}
            onCheckedChange={handleTodasTurmasChange}
          />
          <Label htmlFor="todas-turmas" className="font-medium">
            Todas as turmas
          </Label>
        </div>
        
        <div className="grid grid-cols-2 gap-2 ml-6">
          {turmasDisponiveis.map((turma) => (
            <div key={turma} className="flex items-center space-x-2">
              <Checkbox
                id={turma}
                checked={selectedTurmas.includes(turma)}
                onCheckedChange={(checked) => handleTurmaChange(turma, !!checked)}
              />
              <Label htmlFor={turma} className="text-sm">
                {turma}
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
