import { Badge } from "@/components/ui/badge";

type AttendanceStatus = 'presente' | 'ausente';

interface StatusBadgeProps {
  status: AttendanceStatus;
}

export const StatusBadge = ({ status }: StatusBadgeProps) => {
  if (status === 'presente') {
    return (
      <Badge className="bg-green-100 text-green-700 hover:bg-green-100">
        Presente
      </Badge>
    );
  }
  
  return (
    <Badge className="bg-gray-100 text-gray-700 hover:bg-gray-100">
      Ausente
    </Badge>
  );
};