import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useProfessorAuth } from "@/hooks/useProfessorAuth";
import { GraduationCap, Plus, ArrowLeft, Users } from "lucide-react";
import { Link } from "react-router-dom";

export const ProfessorAlunos = () => {
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
                    <GraduationCap className="w-8 h-8 text-primary" />
                  </div>
                  Alunos
                </h1>
                <p className="text-muted-foreground mt-1">
                  Gerencie seus alunos - Professor: <strong>{professor?.nome_completo}</strong>
                </p>
              </div>
            </div>
            <Button className="bg-primary hover:bg-primary/90">
              <Plus className="w-4 h-4 mr-2" />
              Novo Aluno
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          {/* Empty State */}
          <Card className="bg-white/80 backdrop-blur-sm border border-primary/10">
            <CardHeader className="text-center">
              <CardTitle className="text-primary">Nenhum aluno cadastrado</CardTitle>
            </CardHeader>
            <CardContent className="text-center space-y-4">
              <p className="text-muted-foreground">
                Você ainda não cadastrou nenhum aluno. Primeiro crie uma turma, depois cadastre seus alunos.
              </p>
              <div className="flex gap-2 justify-center">
                <Link to="/professor/turmas">
                  <Button variant="outline">
                    <Users className="w-4 h-4 mr-2" />
                    Criar Turma Primeiro
                  </Button>
                </Link>
                <Button className="bg-primary hover:bg-primary/90" disabled>
                  <Plus className="w-4 h-4 mr-2" />
                  Cadastrar Aluno
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};