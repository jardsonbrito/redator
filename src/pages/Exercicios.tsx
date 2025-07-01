
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Link } from "react-router-dom";
import { ClipboardList, Home, ExternalLink, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useStudentAuth } from "@/hooks/useStudentAuth";

const Exercicios = () => {
  const { studentData } = useStudentAuth();
  
  // Mapear turma para código interno
  const turmasMap = {
    "Turma A": "LRA2025",
    "Turma B": "LRB2025", 
    "Turma C": "LRC2025",
    "Turma D": "LRD2025",
    "Turma E": "LRE2025"
  };
  
  let turmaCode = "Visitante";
  if (studentData.userType === "aluno" && studentData.turma) {
    turmaCode = turmasMap[studentData.turma as keyof typeof turmasMap] || "Visitante";
  } else if (studentData.userType === "visitante") {
    turmaCode = "Visitante";
  }

  const { data: exercicios, isLoading } = useQuery({
    queryKey: ['exercicios', turmaCode],
    queryFn: async () => {
      console.log("Fetching exercicios for turma:", turmaCode);
      
      if (turmaCode === "Visitante") {
        const { data, error } = await supabase
          .from('exercicios')
          .select('*')
          .eq('ativo', true)
          .eq('permite_visitante', true)
          .order('criado_em', { ascending: false });
        
        if (error) {
          console.error("Error fetching exercicios:", error);
          throw error;
        }
        
        return data;
      }

      const { data, error } = await supabase
        .from('exercicios')
        .select('*')
        .eq('ativo', true)
        .or(`turmas.cs.{${turmaCode}},permite_visitante.eq.true`)
        .order('criado_em', { ascending: false });
      
      if (error) {
        console.error("Error fetching exercicios:", error);
        throw error;
      }
      
      console.log("Exercicios fetched for turma:", data);
      return data;
    }
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-violet-100 flex items-center justify-center">
        <div className="text-center">
          <ClipboardList className="w-12 h-12 text-redator-primary mx-auto mb-4 animate-pulse" />
          <p className="text-redator-accent">Carregando exercícios...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-violet-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-redator-accent/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link to="/app" className="flex items-center gap-2 text-redator-primary hover:text-redator-accent transition-colors">
                <Home className="w-5 h-5" />
                <span className="hidden sm:inline">Voltar ao início</span>
              </Link>
              <div className="hidden sm:block w-px h-6 bg-redator-accent/20"></div>
              <h1 className="text-xl sm:text-2xl font-bold text-redator-primary flex items-center gap-2">
                <ClipboardList className="w-6 h-6" />
                Exercícios
              </h1>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-redator-primary mb-2">
            Exercícios Disponíveis
          </h2>
          <p className="text-redator-accent">
            Pratique com exercícios direcionados e formulários especializados
          </p>
        </div>

        {!exercicios || exercicios.length === 0 ? (
          <div className="text-center py-12">
            <ClipboardList className="w-16 h-16 text-redator-accent mx-auto mb-4 opacity-50" />
            <h3 className="text-xl font-semibold text-redator-primary mb-2">
              Nenhum exercício disponível
            </h3>
            <p className="text-redator-accent">
              {studentData.userType === "visitante" 
                ? "Não há exercícios disponíveis para visitantes no momento."
                : "Os exercícios aparecerão aqui quando forem cadastrados para sua turma pelo professor."
              }
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {exercicios.map((exercicio) => (
              <Card key={exercicio.id} className="group hover:shadow-xl transition-all duration-300 hover:scale-105 border-redator-accent/20">
                <CardContent className="p-6">
                  {exercicio.imagem_thumbnail && (
                    <div className="mb-4 rounded-lg overflow-hidden">
                      <img 
                        src={exercicio.imagem_thumbnail} 
                        alt={exercicio.titulo}
                        className="w-full h-32 object-cover group-hover:scale-105 transition-transform"
                      />
                    </div>
                  )}
                  
                  <div className="text-center">
                    <div className={`inline-flex items-center justify-center w-12 h-12 rounded-full mb-4 group-hover:scale-110 transition-transform ${
                      exercicio.tipo === 'formulario' 
                        ? 'bg-redator-accent' 
                        : 'bg-redator-secondary'
                    }`}>
                      {exercicio.tipo === 'formulario' ? (
                        <ExternalLink className="w-6 h-6 text-white" />
                      ) : (
                        <FileText className="w-6 h-6 text-white" />
                      )}
                    </div>
                    
                    <h3 className="text-lg font-semibold text-redator-primary mb-2">
                      {exercicio.titulo}
                    </h3>
                    
                    <p className="text-redator-accent text-sm mb-4">
                      {exercicio.tipo === 'formulario' ? 'Formulário Google' : 'Redação com Tema'}
                    </p>

                    <Link to={`/exercicios/${exercicio.id}`}>
                      <Button className={`w-full text-white ${
                        exercicio.tipo === 'formulario' 
                          ? 'bg-redator-accent hover:bg-redator-accent/90' 
                          : 'bg-redator-secondary hover:bg-redator-secondary/90'
                      }`}>
                        {exercicio.tipo === 'formulario' ? (
                          <>
                            <ExternalLink className="w-4 h-4 mr-2" />
                            Acessar Formulário
                          </>
                        ) : (
                          <>
                            <FileText className="w-4 h-4 mr-2" />
                            Escrever Redação
                          </>
                        )}
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default Exercicios;
