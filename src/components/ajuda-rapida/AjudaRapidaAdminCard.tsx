import { Card, CardContent } from "@/components/ui/card";
import { FolderOpen } from "lucide-react";
import { useNavigate } from "react-router-dom";

export const AjudaRapidaAdminCard = () => {
  const navigate = useNavigate();

  return (
    <Card 
      className="bg-white hover:shadow-md transition-all duration-200 cursor-pointer border-l-4 border-l-primary"
      onClick={() => navigate('/admin/ajuda-rapida')}
    >
      <CardContent className="flex items-center justify-between p-6">
        <div className="flex items-center space-x-4">
          <div className="bg-primary/10 p-3 rounded-lg">
            <FolderOpen className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-lg text-foreground">Recados dos Alunos</h3>
            <p className="text-sm text-muted-foreground">
              Gerenciar conversas entre alunos e corretores
            </p>
          </div>
        </div>
        <div className="text-primary">
          <FolderOpen className="w-5 h-5" />
        </div>
      </CardContent>
    </Card>
  );
};