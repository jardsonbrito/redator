import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StudentHeader } from "@/components/StudentHeader";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useStudentAuth } from "@/hooks/useStudentAuth";
import { supabase } from "@/integrations/supabase/client";
import { ExternalLink, Search, FileText, Edit, Home } from "lucide-react";
import { useNavigate, Link } from "react-router-dom";

interface Exercicio {
  id: string;
  titulo: string;
  tipo: string;
  link_forms?: string;
  tema_id?: string;
  imagem_capa_url?: string;
  turmas_autorizadas: string[] | null;
  permite_visitante: boolean;
  ativo: boolean;
  criado_em: string;
  abrir_aba_externa?: boolean;
  temas?: {
    frase_tematica: string;
    eixo_tematico: string;
  };
}

const Exercicios = () => {
  const { studentData } = useStudentAuth();
  const navigate = useNavigate();
  const [exercicios, setExercicios] = useState<Exercicio[]>([]);
  const [filteredExercicios, setFilteredExercicios] = useState<Exercicio[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [tipoFilter, setTipoFilter] = useState("");

  const tiposDisponiveis = [
    'Google Forms',
    'Redação com Frase Temática'
  ];

  useEffect(() => {
    fetchExercicios();
  }, []);

  useEffect(() => {
    filterExercicios();
  }, [exercicios, searchTerm, tipoFilter]);

  const fetchExercicios = async () => {
    try {
      const { data, error } = await supabase
        .from("exercicios")
        .select(`
          *,
          temas (
            frase_tematica,
            eixo_tematico
          )
        `)
        .eq("ativo", true)
        .order("criado_em", { ascending: false });

      if (error) throw error;
      setExercicios(data || []);
    } catch (error) {
      console.error("Erro ao buscar exercícios:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const filterExercicios = () => {
    console.log('🔍 Filtrando exercícios:', { 
      totalExercicios: exercicios.length, 
      userType: studentData.userType, 
      userTurma: studentData.turma 
    });

    let filtered = exercicios.filter(exercicio => {
      console.log('📝 Verificando exercício:', { 
        titulo: exercicio.titulo, 
        turmasAutorizadas: exercicio.turmas_autorizadas, 
        permiteVisitante: exercicio.permite_visitante,
        ativo: exercicio.ativo
      });

      // Verificar se o usuário tem acesso
      const isVisitante = studentData.userType === "visitante";
      const userTurma = studentData.turma;

      // Permitir se for visitante e exercício permite visitante
      if (isVisitante && exercicio.permite_visitante) {
        console.log('✅ Acesso de visitante permitido');
        return true;
      }
      
      // Permitir se for aluno e está na turma autorizada ou se turmas_autorizadas está vazio/null
      if (!isVisitante && userTurma && userTurma !== "visitante") {
        const turmasAutorizadas = exercicio.turmas_autorizadas || [];
        // Comparação case-insensitive para as turmas
        const hasAccess = turmasAutorizadas.length === 0 || 
          turmasAutorizadas.some(turma => turma.toUpperCase() === userTurma.toUpperCase());
        console.log('👤 Verificando acesso do aluno:', { userTurma, turmasAutorizadas, hasAccess });
        return hasAccess;
      }

      console.log('❌ Acesso negado');
      return false;
    });

    // Aplicar filtros de busca
    if (searchTerm) {
      filtered = filtered.filter(exercicio =>
        exercicio.titulo.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (tipoFilter && tipoFilter !== "todos") {
      filtered = filtered.filter(exercicio => exercicio.tipo === tipoFilter);
    }

    console.log('📊 Resultado da filtragem:', { totalFiltrados: filtered.length });
    setFilteredExercicios(filtered);
  };

  const handleRedacaoExercicio = (exercicio: Exercicio) => {
    if (exercicio.tema_id) {
      // Navegar para a página de redação com o tema do exercício
      navigate(`/temas/${exercicio.tema_id}?exercicio=${exercicio.id}`);
    }
  };

  if (isLoading) {
    return (
      <ProtectedRoute>
        <TooltipProvider>
          <div className="min-h-screen bg-gradient-to-br from-purple-50 to-violet-100">
            <StudentHeader pageTitle="Exercícios" />
            <div className="max-w-6xl mx-auto px-4 py-8">
              <div className="text-center py-8">Carregando exercícios...</div>
            </div>
          </div>
        </TooltipProvider>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <TooltipProvider>
        <div className="min-h-screen bg-gradient-to-br from-purple-50 to-violet-100">
        <StudentHeader pageTitle="Exercícios" />

        <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center mb-8">
            <p className="text-lg text-redator-accent">
              Pratique com exercícios direcionados e desenvolva suas habilidades
            </p>
          </div>

          {/* Filtros */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Search className="w-5 h-5" />
                Filtros
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Input
                    placeholder="Buscar por título..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <div>
                  <Select value={tipoFilter} onValueChange={setTipoFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="Filtrar por tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todos os tipos</SelectItem>
                      {tiposDisponiveis.map((tipo) => (
                        <SelectItem key={tipo} value={tipo}>
                          {tipo}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Lista de Exercícios */}
          <div className="grid gap-6">
            {filteredExercicios.length === 0 ? (
              <Card>
                <CardContent className="text-center py-12">
                  <h3 className="text-xl font-semibold text-redator-primary mb-2">
                    Nenhum exercício disponível no momento.
                  </h3>
                  <p className="text-redator-accent">
                    Verifique novamente em breve ou entre em contato com sua coordenação.
                  </p>
                </CardContent>
              </Card>
            ) : (
              filteredExercicios.map((exercicio) => (
                <Card key={exercicio.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-xl mb-2">{exercicio.titulo}</CardTitle>
                        <div className="flex gap-2 mb-2">
                          <Badge variant="outline">
                            {exercicio.tipo}
                          </Badge>
                          {exercicio.temas && (
                            <Badge variant="secondary">
                              {exercicio.temas.eixo_tematico}
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        {exercicio.tipo === 'Google Forms' && exercicio.link_forms && (
                          exercicio.abrir_aba_externa ? (
                            <Button
                              variant="default"
                              size="sm"
                              onClick={() => window.open(exercicio.link_forms, '_blank')}
                            >
                              <ExternalLink className="w-4 h-4 mr-2" />
                              Abrir Formulário
                            </Button>
                          ) : (
                            <Button
                              variant="default"
                              size="sm"
                              onClick={() => {
                                // Criar modal ou iframe para exibir o formulário embutido
                                const modal = document.createElement('div');
                                modal.style.cssText = `
                                  position: fixed;
                                  top: 0;
                                  left: 0;
                                  width: 100vw;
                                  height: 100vh;
                                  background: rgba(0,0,0,0.8);
                                  z-index: 9999;
                                  display: flex;
                                  align-items: center;
                                  justify-content: center;
                                `;
                                modal.innerHTML = `
                                  <div style="
                                    width: 95%;
                                    height: 95%;
                                    background: white;
                                    border-radius: 8px;
                                    position: relative;
                                    overflow: hidden;
                                  ">
                                    <button style="
                                      position: absolute;
                                      top: 10px;
                                      right: 15px;
                                      background: #f44336;
                                      color: white;
                                      border: none;
                                      border-radius: 4px;
                                      padding: 8px 12px;
                                      cursor: pointer;
                                      z-index: 10000;
                                      font-size: 16px;
                                    " onclick="this.parentElement.parentElement.remove()">✕ Fechar</button>
                                    <iframe 
                                      src="${exercicio.link_forms}" 
                                      style="width: 100%; height: 100%; border: none;"
                                      frameborder="0"
                                    ></iframe>
                                  </div>
                                `;
                                document.body.appendChild(modal);
                              }}
                            >
                              <FileText className="w-4 h-4 mr-2" />
                              Abrir Formulário
                            </Button>
                          )
                        )}
                        {exercicio.tipo === 'Redação com Frase Temática' && exercicio.tema_id && (
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => handleRedacaoExercicio(exercicio)}
                          >
                            <Edit className="w-4 h-4 mr-2" />
                            Escrever Redação
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {exercicio.temas && (
                      <div className="mb-3">
                        <strong>Tema:</strong> {exercicio.temas.frase_tematica}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </main>
      </div>
    </TooltipProvider>
  </ProtectedRoute>
  );
};

export default Exercicios;