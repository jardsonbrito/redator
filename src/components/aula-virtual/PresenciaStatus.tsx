import { format } from "date-fns";
import { toZonedTime } from "date-fns-tz";
import { ptBR } from "date-fns/locale";

interface PresenciaStatusProps {
  entrada?: string | null;
  saida?: string | null;
}

export const PresenciaStatus = ({ entrada, saida }: PresenciaStatusProps) => {
  const formatTimestamp = (timestamp?: string | null) => {
    if (!timestamp) return "—";
    
    const utcDate = new Date(timestamp);
    const zonedDate = toZonedTime(utcDate, "America/Sao_Paulo");
    
    return format(zonedDate, "HH:mm:ss", { locale: ptBR });
  };

  if (!entrada && !saida) return null;

  return (
    <div className="bg-gray-50 p-3 rounded-md mt-3">
      <p className="text-sm font-medium text-gray-700 mb-1">Status da Presença:</p>
      <div className="flex gap-4 text-xs text-gray-600">
        <div>
          <span className="font-medium">Entrada:</span> {formatTimestamp(entrada)}
        </div>
        <div>
          <span className="font-medium">Saída:</span> {formatTimestamp(saida)}
        </div>
      </div>
    </div>
  );
};