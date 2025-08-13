
import { Calendar, Clock, Users } from "lucide-react";
import { format, parse } from "date-fns";
import { ptBR } from "date-fns/locale/pt-BR";
import { AulaVirtual } from "./types";

interface AulaInfoGridProps {
  aulaAtiva: AulaVirtual;
  turmaCode: string;
  aulaEmAndamento: boolean;
  aulaFutura: boolean;
}

export const AulaInfoGrid = ({ aulaAtiva, turmaCode, aulaEmAndamento, aulaFutura }: AulaInfoGridProps) => {
  const inicioAula = parse(`${aulaAtiva.data_aula}T${aulaAtiva.horario_inicio}`, "yyyy-MM-dd'T'HH:mm", new Date());
  
  const getColorClasses = () => {
    if (aulaEmAndamento) return 'text-red-700 bg-red-100';
    if (aulaFutura) return 'text-blue-700 bg-blue-100';
    return 'text-gray-700 bg-gray-100';
  };

  const colorClasses = getColorClasses();

  return (
    <div className="bg-white p-5 rounded-lg border border-gray-200 shadow-sm">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm mb-4">
        <div className={`flex items-center gap-2 p-3 rounded-lg ${colorClasses}`}>
          <Calendar className="w-5 h-5" />
          <span>
            <strong>Data:</strong> {format(inicioAula, "dd/MM/yyyy", { locale: ptBR })}
          </span>
        </div>
        <div className={`flex items-center gap-2 p-3 rounded-lg ${colorClasses}`}>
          <Clock className="w-5 h-5" />
          <span>
            <strong>Horário:</strong> {aulaAtiva.horario_inicio} - {aulaAtiva.horario_fim}
          </span>
        </div>
        <div className={`flex items-center gap-2 p-3 rounded-lg ${colorClasses}`}>
          <Users className="w-5 h-5" />
          <span>
            <strong>Turma:</strong> {turmaCode === "Visitante" ? "Visitantes" : turmaCode}
          </span>
        </div>
      </div>
    </div>
  );
};
