
import { Badge } from "@/components/ui/badge";

interface AulaStatusBadgeProps {
  aulaEmAndamento: boolean;
  aulaFutura: boolean;
}

export const AulaStatusBadge = ({ aulaEmAndamento, aulaFutura }: AulaStatusBadgeProps) => {
  if (aulaEmAndamento) {
    return <Badge className="bg-red-500 text-white font-bold animate-pulse">AO VIVO</Badge>;
  }
  
  if (aulaFutura) {
    return <Badge className="bg-blue-500 text-white">AGENDADA</Badge>;
  }
  
  return <Badge className="bg-gray-500 text-white">ENCERRADA</Badge>;
};
