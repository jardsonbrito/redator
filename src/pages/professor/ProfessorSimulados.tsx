import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ClipboardCheck, ArrowLeft, Lock } from "lucide-react";
import { Link } from "react-router-dom";

export const ProfessorSimulados = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-secondary/10">
      <header className="bg-white/90 backdrop-blur-sm shadow-lg border-b border-primary/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center gap-4">
            <Link to="/professor/dashboard">
              <Button variant="outline" size="sm">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Voltar
              </Button>
            </Link>
            <h1 className="text-2xl font-bold text-primary flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <ClipboardCheck className="w-6 h-6 text-primary" />
              </div>
              Simulados
            </h1>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
