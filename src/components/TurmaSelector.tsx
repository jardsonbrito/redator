
import { useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

const turmasDisponiveis = [
  "1ª SÉRIE - A",
  "1ª SÉRIE - B", 
  "2ª SÉRIE - A",
  "2ª SÉRIE - B",
  "3ª SÉRIE - A",
  "3ª SÉRIE - B"
];

interface TurmaSelectorProps {
  selectedTurmas: string[];
  onTurmasChange: (turmas: string[]) => void;
}

export const TurmaSelector = ({ selectedTurmas, onTurmasChange }: TurmaSelectorProps) => {
  const handleTurmaChange = (turma: string, checked: boolean) => {
    if (checked) {
      onTurmasChange([...selectedTurmas, turma]);
    } else {
      onTurmasChange(selectedTurmas.filter(t => t !== turma));
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center space-x-2">
        <Checkbox
          id="todas-turmas"
          checked={selectedTurmas.length === turmasDisponiveis.length}
          onCheckedChange={(checked) => {
            if (checked) {
              onTurmasChange(turmasDisponiveis);
            } else {
              onTurmasChange([]);
            }
          }}
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
  );
};
