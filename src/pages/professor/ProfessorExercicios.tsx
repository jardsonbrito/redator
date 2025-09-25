import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useProfessorAuth } from "@/hooks/useProfessorAuth";
import { NotebookPen, Plus, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { ExercicioForm } from "@/components/admin/ExercicioForm";

export const ProfessorExercicios = () => {
  const { professor } = useProfessorAuth();
  const [showForm, setShowForm] = useState(false);

  const handleSuccess = () => {
    setShowForm(false);
    // Aqui você pode adicionar lógica para recarregar a lista de exercícios
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-secondary/10">
      {/* Header */}
      <header className="bg-white/90 backdrop-blur-sm shadow-lg border-b border-primary/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link to="/professor/dashboard">
                <Button variant="outline" size="sm">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Voltar
                </Button>
              </Link>
              <div>
                <h1 className="text-3xl font-bold text-primary flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <NotebookPen className="w-8 h-8 text-primary" />
                  </div>
                  Exercícios
                </h1>
                <p className="text-muted-foreground mt-1">
                  Gerencie seus exercícios - Professor: <strong>{professor?.nome_completo}</strong>
                </p>
              </div>
            </div>
            <Button 
              className="bg-primary hover:bg-primary/90"
              onClick={() => setShowForm(true)}
            >
              <Plus className="w-4 h-4 mr-2" />
              Novo Exercício
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          {showForm ? (
            <ExercicioForm
              mode="create"
              onSuccess={handleSuccess}
              onCancelEdit={() => setShowForm(false)}
            />
          ) : (
            /* Empty State */
            <Card className="bg-white/80 backdrop-blur-sm border border-primary/10">
              <CardHeader className="text-center">
                <CardTitle className="text-primary">Nenhum exercício cadastrado</CardTitle>
              </CardHeader>
              <CardContent className="text-center space-y-4">
                <p className="text-muted-foreground">
                  Você ainda não criou nenhum exercício. Clique no botão abaixo para criar seu primeiro exercício.
                </p>
                <Button 
                  className="bg-primary hover:bg-primary/90"
                  onClick={() => setShowForm(true)}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Criar Primeiro Exercício
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
};