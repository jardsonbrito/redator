import { Card, CardContent } from "@/components/ui/card";
import { Lock } from "lucide-react";
import { StudentHeader } from "@/components/StudentHeader";
import { usePageTitle } from "@/hooks/useBreadcrumbs";

export const ProfessorSimulados = () => {
  usePageTitle('Simulados');

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-violet-100">
      <StudentHeader pageTitle="Simulados" />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card className="bg-white/80 backdrop-blur-sm border border-primary/10">
          <CardContent className="text-center py-16 space-y-4">
            <div className="flex justify-center">
              <div className="p-4 bg-muted rounded-full">
                <Lock className="w-10 h-10 text-muted-foreground" />
              </div>
            </div>
            <h2 className="text-xl font-semibold text-muted-foreground">
              Módulo indisponível para professores
            </h2>
            <p className="text-muted-foreground max-w-sm mx-auto">
              Os simulados são gerenciados pelo Laboratório e destinados aos alunos. Entre em contato com a administração caso precise de acesso.
            </p>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};
