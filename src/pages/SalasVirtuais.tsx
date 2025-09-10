import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Video, Calendar, Clock } from "lucide-react";
import { usePageTitle } from "@/hooks/useBreadcrumbs";

const SalasVirtuais = () => {
  // Configurar título da página
  usePageTitle('Salas Virtuais');
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-secondary/20 via-secondary/10 to-secondary/5 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-primary mb-2">Salas Virtuais</h1>
          <p className="text-muted-foreground">
            Acesse suas salas virtuais vinculadas à turma
          </p>
        </div>

        <Card>
          <CardContent className="text-center py-12">
            <Users className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Em desenvolvimento</h3>
            <p className="text-muted-foreground">
              A funcionalidade de Salas Virtuais estará disponível em breve
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SalasVirtuais;