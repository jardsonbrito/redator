import { Card, CardContent } from "@/components/ui/card";
import { Trophy } from "lucide-react";
import { useNavigate } from "react-router-dom";

export const MinhasConquistasCard = () => {
  const navigate = useNavigate();

  const handleClick = () => {
    navigate('/minhas-conquistas');
  };

  return (
    <Card 
      className="cursor-pointer hover:shadow-lg transition-all duration-200 hover:scale-[1.02] bg-gradient-to-br from-primary/5 to-secondary/5 border-primary/20"
      onClick={handleClick}
    >
      <CardContent className="flex flex-col items-center justify-center p-6 h-32">
        <Trophy className="h-8 w-8 text-primary mb-2" />
        <h3 className="text-lg font-semibold text-center">Minhas Conquistas</h3>
        <p className="text-sm text-muted-foreground text-center">
          Acompanhe suas atividades
        </p>
      </CardContent>
    </Card>
  );
};