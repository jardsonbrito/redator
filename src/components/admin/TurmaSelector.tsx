
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users } from "lucide-react";

interface TurmaSelectorProps {
  onTurmaSelect: (turma: string) => void;
}

export const TurmaSelector = ({ onTurmaSelect }: TurmaSelectorProps) => {
  const turmas = [
    { codigo: "Turma A", nome: "Turma A", cor: "bg-blue-100 text-blue-800 hover:bg-blue-200" },
    { codigo: "Turma B", nome: "Turma B", cor: "bg-green-100 text-green-800 hover:bg-green-200" },
    { codigo: "Turma C", nome: "Turma C", cor: "bg-purple-100 text-purple-800 hover:bg-purple-200" },
    { codigo: "Turma D", nome: "Turma D", cor: "bg-orange-100 text-orange-800 hover:bg-orange-200" },
    { codigo: "Turma E", nome: "Turma E", cor: "bg-pink-100 text-pink-800 hover:bg-pink-200" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Selecione uma Turma</h2>
        <p className="text-gray-600">Escolha a turma para visualizar os alunos e gerenciar seus dados.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {turmas.map((turma) => (
          <Card 
            key={turma.codigo}
            className={`cursor-pointer transition-all duration-200 hover:shadow-lg border-2 hover:border-primary/20 ${turma.cor}`}
            onClick={() => onTurmaSelect(turma.codigo)}
          >
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-3">
                <Users className="w-6 h-6" />
                {turma.nome}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm opacity-80">
                Clique para ver os alunos desta turma
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};
