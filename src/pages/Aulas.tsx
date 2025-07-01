import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StudentHeader } from "@/components/StudentHeader";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { useStudentAuth } from "@/hooks/useStudentAuth";
import { supabase } from "@/integrations/supabase/client";
import { ExternalLink, FileText, Search } from "lucide-react";

interface Aula {
  id: string;
  titulo: string;
  descricao: string;
  modulo: string;
  link_conteudo: string;
  pdf_url?: string;
  pdf_nome?: string;
  turmas_autorizadas: string[] | null;
  permite_visitante: boolean;
  ativo: boolean;
  criado_em: string;
}

const Aulas = () => {
  const { studentData } = useStudentAuth();
  const [aulas, setAulas] = useState<Aula[]>([]);
  const [filteredAulas, setFilteredAulas] = useState<Aula[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [moduloFilter, setModuloFilter] = useState("");

  const modulosDisponiveis = [
    'Competência 1',
    'Competência 2',
    'Competência 3',
    'Competência 4',
    'Competência 5',
    'Aula ao vivo'
  ];

  useEffect(() => {
    fetchAulas();
  }, []);

  useEffect(() => {
    filterAulas();
  }, [aulas, searchTerm, moduloFilter]);

  const fetchAulas = async () => {
    try {
      const { data, error } = await supabase
        .from("aulas")
        .select("*")
        .eq("ativo", true)
        .order("criado_em", { ascending: false });

      if (error) throw error;
      setAulas(data || []);
    } catch (error) {
      console.error("Erro ao buscar aulas:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const filterAulas = () => {
    console.log('🔍 Filtrando aulas:', { 
      totalAulas: aulas.length, 
      userType: studentData.userType, 
      userTurma: studentData.turma 
    });

    let filtered = aulas.filter(aula => {
      console.log('📚 Verificando aula:', { 
        titulo: aula.titulo, 
        turmasAutorizadas: aula.turmas_autorizadas, 
        permiteVisitante: aula.permite_visitante,
        ativo: aula.ativo
      });

      // Verificar se o usuário tem acesso
      const isVisitante = studentData.userType === "visitante";
      const userTurma = studentData.turma;

      // Permitir se for visitante e aula permite visitante
      if (isVisitante && aula.permite_visitante) {
        console.log('✅ Acesso de visitante permitido');
        return true;
      }
      
      // Permitir se for aluno e está na turma autorizada ou se turmas_autorizadas está vazio/null
      if (!isVisitante && userTurma && userTurma !== "visitante") {
        const turmasAutorizadas = aula.turmas_autorizadas || [];
        const hasAccess = turmasAutorizadas.length === 0 || turmasAutorizadas.includes(userTurma);
        console.log('👤 Verificando acesso do aluno:', { userTurma, turmasAutorizadas, hasAccess });
        return hasAccess;
      }

      console.log('❌ Acesso negado');
      return false;
    });

    // Aplicar filtros de busca
    if (searchTerm) {
      filtered = filtered.filter(aula =>
        aula.titulo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        aula.descricao.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (moduloFilter) {
      filtered = filtered.filter(aula => aula.modulo === moduloFilter);
    }

    console.log('📊 Resultado da filtragem:', { totalFiltradas: filtered.length });
    setFilteredAulas(filtered);
  };

  if (isLoading) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-gradient-to-br from-purple-50 to-violet-100">
          <StudentHeader />
          <div className="max-w-6xl mx-auto px-4 py-8">
            <div className="text-center py-8">Carregando aulas...</div>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-violet-100">
        <StudentHeader />
        
        <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-redator-primary mb-4">Aulas</h1>
            <p className="text-lg text-redator-accent">
              Acesse conteúdos educacionais organizados por competência
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
                    placeholder="Buscar por título ou descrição..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <div>
                  <Select value={moduloFilter} onValueChange={setModuloFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="Filtrar por módulo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Todos os módulos</SelectItem>
                      {modulosDisponiveis.map((modulo) => (
                        <SelectItem key={modulo} value={modulo}>
                          {modulo}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Lista de Aulas */}
          <div className="grid gap-6">
            {filteredAulas.length === 0 ? (
              <Card>
                <CardContent className="text-center py-12">
                  <h3 className="text-xl font-semibold text-redator-primary mb-2">
                    Nenhuma aula disponível no momento.
                  </h3>
                  <p className="text-redator-accent">
                    Verifique novamente em breve ou entre em contato com sua coordenação.
                  </p>
                </CardContent>
              </Card>
            ) : (
              filteredAulas.map((aula) => (
                <Card key={aula.id} className={`hover:shadow-lg transition-shadow ${
                  aula.modulo === 'Aula ao vivo' ? 'border-l-4 border-l-red-500 bg-red-50' : ''
                }`}>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-xl mb-2">{aula.titulo}</CardTitle>
                        <Badge 
                          variant="outline" 
                          className={`mb-2 ${
                            aula.modulo === 'Aula ao vivo' 
                              ? 'bg-red-100 text-red-800 border-red-300' 
                              : ''
                          }`}
                        >
                          {aula.modulo}
                        </Badge>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => window.open(aula.link_conteudo, '_blank')}
                        >
                          <ExternalLink className="w-4 h-4 mr-2" />
                          Acessar Aula
                        </Button>
                        {aula.pdf_url && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => window.open(aula.pdf_url, '_blank')}
                          >
                            <FileText className="w-4 h-4 mr-2" />
                            Material PDF
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-700 mb-4">{aula.descricao}</p>
                    
                    {aula.pdf_nome && (
                      <div className="text-sm text-gray-600">
                        <strong>Material complementar:</strong> {aula.pdf_nome}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </main>
      </div>
    </ProtectedRoute>
  );
};

export default Aulas;