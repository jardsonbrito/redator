import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useProfessorAuth } from "@/hooks/useProfessorAuth";
import { Lightbulb, Plus, ArrowLeft, Globe } from "lucide-react";
import { Link } from "react-router-dom";

export const ProfessorTemas = () => {
  const { professor } = useProfessorAuth();

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
                    <Lightbulb className="w-8 h-8 text-primary" />
                  </div>
                  Temas
                </h1>
                <p className="text-muted-foreground mt-1">
                  Gerencie seus temas + Conteúdo compartilhado - Professor: <strong>{professor?.nome_completo}</strong>
                </p>
              </div>
            </div>
            <Button className="bg-primary hover:bg-primary/90">
              <Plus className="w-4 h-4 mr-2" />
              Novo Tema
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          {/* Shared Content Section */}
          <Card className="bg-blue-50/80 backdrop-blur-sm border border-blue-200">
            <CardHeader>
              <CardTitle className="text-blue-600 flex items-center gap-2">
                <Globe className="w-5 h-5" />
                Conteúdo Compartilhado pelo Administrador
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Aqui aparecerão os temas criados pelo administrador master e marcados como "Exibir para todos os professores".
              </p>
            </CardContent>
          </Card>

          {/* Own Content Section */}
          <Card className="bg-white/80 backdrop-blur-sm border border-primary/10">
            <CardHeader className="text-center">
              <CardTitle className="text-primary">Meus Temas</CardTitle>
            </CardHeader>
            <CardContent className="text-center space-y-4">
              <p className="text-muted-foreground">
                Você ainda não criou nenhum tema próprio. Clique no botão abaixo para criar seu primeiro tema.
              </p>
              <Button className="bg-primary hover:bg-primary/90">
                <Plus className="w-4 h-4 mr-2" />
                Criar Primeiro Tema
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};