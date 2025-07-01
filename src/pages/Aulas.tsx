
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Link } from "react-router-dom";
import { GraduationCap, BookOpen, Video, Home, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

const Aulas = () => {
  // Recupera a turma do localStorage
  const alunoTurma = localStorage.getItem("alunoTurma");
  const turmaCode = alunoTurma || "Visitante";

  console.log("Aulas page - turmaCode:", turmaCode);

  const { data: modules, isLoading } = useQuery({
    queryKey: ['aula-modules', turmaCode],
    queryFn: async () => {
      console.log("Fetching aula modules for turma:", turmaCode);
      
      // Buscar todos os módulos ativos
      const { data: allModules, error: modulesError } = await supabase
        .from('aula_modules')
        .select('*')
        .eq('ativo', true)
        .order('ordem');
      
      if (modulesError) {
        console.error("Error fetching modules:", modulesError);
        throw modulesError;
      }

      // Para cada módulo, verificar se há aulas disponíveis
      const modulesWithAulas = [];
      
      for (const module of allModules) {
        let aulas;
        
        // Se for visitante, verificar aulas que permitem visitante
        if (turmaCode === "Visitante") {
          const { data: aulasData, error: aulasError } = await supabase
            .from('aulas')
            .select('id')
            .eq('module_id', module.id)
            .eq('ativo', true)
            .eq('permite_visitante', true)
            .limit(1);
          
          if (aulasError) {
            console.error("Error fetching aulas for visitante:", aulasError);
            continue;
          }
          
          aulas = aulasData;
        } else {
          // Se for aluno, verificar aulas da sua turma ou que permitem visitante
          const { data: aulasData, error: aulasError } = await supabase
            .from('aulas')
            .select('id')
            .eq('module_id', module.id)
            .eq('ativo', true)
            .or(`turmas.cs.{${turmaCode}},permite_visitante.eq.true`)
            .limit(1);
          
          if (aulasError) {
            console.error("Error fetching aulas for turma:", turmaCode, aulasError);
            continue;
          }
          
          aulas = aulasData;
        }

        // Se há pelo menos uma aula disponível, incluir o módulo
        if (aulas && aulas.length > 0) {
          modulesWithAulas.push(module);
        }
      }
      
      console.log("Modules with aulas for turma:", turmaCode, modulesWithAulas);
      return modulesWithAulas;
    },
    enabled: !!turmaCode
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-violet-100 flex items-center justify-center">
        <div className="text-center">
          <GraduationCap className="w-12 h-12 text-redator-primary mx-auto mb-4 animate-pulse" />
          <p className="text-redator-accent">Carregando módulos...</p>
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
                <GraduationCap className="w-6 h-6" />
                Aulas
              </h1>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-redator-primary mb-2">
            Módulos de Aprendizagem
          </h2>
          <p className="text-redator-accent">
            Escolha um módulo para acessar as aulas e dominar cada competência
          </p>
        </div>

        {!modules || modules.length === 0 ? (
          <div className="text-center py-12">
            <GraduationCap className="w-16 h-16 text-redator-accent mx-auto mb-4 opacity-50" />
            <h3 className="text-xl font-semibold text-redator-primary mb-2">
              {turmaCode === "Visitante" 
                ? "Nenhuma aula disponível para visitantes" 
                : "Nenhuma aula disponível para sua turma"
              }
            </h3>
            <p className="text-redator-accent">
              As aulas aparecerão aqui quando forem cadastradas pelo professor.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {modules.map((module) => (
              <Card key={module.id} className="group hover:shadow-xl transition-all duration-300 hover:scale-105 border-redator-accent/20">
                <CardContent className="p-6">
                  <div className="text-center">
                    <div className={`inline-flex items-center justify-center w-12 h-12 rounded-full mb-4 group-hover:scale-110 transition-transform ${
                      module.tipo === 'ao_vivo' 
                        ? 'bg-redator-secondary' 
                        : 'bg-redator-primary'
                    }`}>
                      {module.tipo === 'ao_vivo' ? (
                        <ExternalLink className="w-6 h-6 text-white" />
                      ) : (
                        <BookOpen className="w-6 h-6 text-white" />
                      )}
                    </div>
                    
                    <h3 className="text-lg font-semibold text-redator-primary mb-2">
                      {module.nome}
                    </h3>
                    
                    <p className="text-redator-accent text-sm mb-4 line-clamp-2">
                      {module.descricao}
                    </p>

                    {module.tipo === 'ao_vivo' ? (
                      <Link to={`/aulas/ao-vivo`}>
                        <Button className="w-full bg-redator-secondary hover:bg-redator-secondary/90 text-white">
                          <ExternalLink className="w-4 h-4 mr-2" />
                          Acessar Aula ao Vivo
                        </Button>
                      </Link>
                    ) : (
                      <Link to={`/aulas/modulo/${module.id}`}>
                        <Button className="w-full bg-redator-primary hover:bg-redator-primary/90 text-white">
                          <Video className="w-4 h-4 mr-2" />
                          Ver Aulas
                        </Button>
                      </Link>
                    )}
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

export default Aulas;
