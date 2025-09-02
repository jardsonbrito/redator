import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useProfessorAuth } from "@/hooks/useProfessorAuth";
import { GraduationCap, Plus, ArrowLeft, Users } from "lucide-react";
import { Link } from "react-router-dom";
import { AlunoFormProfessor } from "@/components/professor/AlunoFormProfessor";
import { AlunoListProfessor } from "@/components/professor/AlunoListProfessor";

export const ProfessorAlunos = () => {
  const { professor } = useProfessorAuth();
  const [showForm, setShowForm] = useState(false);
  const [refreshList, setRefreshList] = useState(false);

  const handleSuccess = () => {
    setShowForm(false);
    setRefreshList(prev => !prev); // Trigger refresh
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
                    <GraduationCap className="w-8 h-8 text-primary" />
                  </div>
                  Alunos e Visitantes
                </h1>
                <p className="text-muted-foreground mt-1">
                  Monitore alunos oficiais e visitantes engajados - Professor: <strong>{professor?.nome_completo}</strong>
                </p>
              </div>
            </div>
            <Button 
              className="bg-primary hover:bg-primary/90"
              onClick={() => setShowForm(true)}
            >
              <Plus className="w-4 h-4 mr-2" />
              Novo Aluno
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          {showForm ? (
            <AlunoFormProfessor 
              onSuccess={handleSuccess} 
              onCancel={() => setShowForm(false)} 
            />
          ) : (
            <>
              {/* Lista de Alunos e Visitantes */}
              <AlunoListProfessor refresh={refreshList} />
              
              {/* Card informativo */}
              <Card className="bg-blue-50/80 backdrop-blur-sm border border-blue-200">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <Users className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-blue-800 mb-2">
                        Monitore Visitantes Engajados
                      </h3>
                      <p className="text-sm text-blue-700 mb-3">
                        Visitantes que enviaram redações aparecem aqui como potenciais alunos. 
                        Use o botão "Detalhes" para ver mais informações e enviar convites.
                      </p>
                      <div className="flex gap-2">
                        <Link to="/professor/turmas">
                          <Button variant="outline" size="sm" className="border-blue-200 hover:bg-blue-100">
                            <Users className="w-4 h-4 mr-2" />
                            Gerenciar Turmas
                          </Button>
                        </Link>
                        <Button 
                          size="sm"
                          className="bg-blue-600 hover:bg-blue-700"
                          onClick={() => setShowForm(true)}
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          Cadastrar Novo Aluno
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </main>
    </div>
  );
};