import { Card, CardContent } from "@/components/ui/card";
import { RefreshCw } from "lucide-react";
import { useNavigate } from "react-router-dom";

export const AjudaRapidaCard = () => {
  const navigate = useNavigate();

  return (
    <Card 
      className="bg-white hover:shadow-md transition-all duration-200 cursor-pointer border-l-4 border-l-primary"
      onClick={() => navigate('/ajuda-rapida')}
    >
      <CardContent className="flex items-center justify-between p-6">
        <div className="flex items-center space-x-4">
          <div className="bg-primary/10 p-3 rounded-lg">
            <RefreshCw className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-lg text-foreground">Ajuda Rápida</h3>
            <p className="text-sm text-muted-foreground">
              Converse com seus corretores
            </p>
          </div>
        </div>
        <div className="text-primary">
          <RefreshCw className="w-5 h-5" />
        </div>
      </CardContent>
    </Card>
  );
};