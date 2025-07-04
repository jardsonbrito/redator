import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Home, Download, Search, Calendar } from "lucide-react";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useStudentAuth } from "@/hooks/useStudentAuth";
import { StudentHeader } from "@/components/StudentHeader";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useState } from "react";

const Biblioteca = () => {
  const { studentData } = useStudentAuth();
  const [busca, setBusca] = useState("");
  const [competenciaFiltro, setCompetenciaFiltro] = useState("todas");
  
  // Determina a turma do usuário
  let turmaCode = "Visitante";
  if (studentData.userType === "aluno" && studentData.turma) {
    turmaCode = studentData.turma;
  }

  const { data: materiais, isLoading, error } = useQuery({
    queryKey: ['biblioteca-materiais', turmaCode, busca, competenciaFiltro],
    queryFn: async () => {
      try {
        let query = supabase
          .from('biblioteca_materiais')
          .select('*')
          .eq('status', 'publicado')
          .order('data_publicacao', { ascending: false });

        // Filtra por turma ou visitante
        if (turmaCode === "Visitante") {
          query = query.eq('permite_visitante', true);
        } else {
          query = query.or(`turmas_autorizadas.cs.{${turmaCode}},permite_visitante.eq.true`);
        }

        // Aplica filtros de busca
        if (busca) {
          query = query.or(`titulo.ilike.%${busca}%,descricao.ilike.%${busca}%`);
        }

        if (competenciaFiltro && competenciaFiltro !== "todas") {
          query = query.eq('competencia', competenciaFiltro);
        }
        
        const { data, error } = await query;
        
        if (error) {
          console.error('Database error:', error);
          throw error;
        }
        
        return data || [];
      } catch (error) {
        console.error('Query error:', error);
        throw error;
      }
    }
  });

  const handleDownload = async (arquivoUrl: string, arquivoNome: string) => {
    try {
      const { data, error } = await supabase.storage
        .from('biblioteca-pdfs')
        .download(arquivoUrl);

      if (error) {
        console.error('Download error:', error);
        throw error;
      }

      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = arquivoNome;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Erro ao baixar arquivo:', error);
    }
  };

  if (isLoading) {
    return (
      <ProtectedRoute>
        <TooltipProvider>
          <div className="min-h-screen bg-gradient-to-br from-purple-50 to-violet-100">
            <StudentHeader pageTitle="Biblioteca" />
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
              <div className="text-center">Carregando materiais...</div>
            </main>
          </div>
        </TooltipProvider>
      </ProtectedRoute>
    );
  }

  if (error) {
    console.error('Biblioteca error:', error);
  }

  return (
    <ProtectedRoute>
      <TooltipProvider>
        <div className="min-h-screen bg-gradient-to-br from-purple-50 to-violet-100">
          <StudentHeader pageTitle="Biblioteca" />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-redator-primary mb-2">
            Materiais Disponíveis
          </h2>
          <p className="text-redator-accent">
            Acesse materiais em PDF organizados por competência para aprimorar seus estudos.
          </p>
        </div>

        {/* Filtros */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
          <div className="grid md:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Buscar por título ou descrição..."
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select value={competenciaFiltro} onValueChange={setCompetenciaFiltro}>
              <SelectTrigger>
                <SelectValue placeholder="Filtrar por competência" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas as competências</SelectItem>
                <SelectItem value="C1">Competência 1</SelectItem>
                <SelectItem value="C2">Competência 2</SelectItem>
                <SelectItem value="C3">Competência 3</SelectItem>
                <SelectItem value="C4">Competência 4</SelectItem>
                <SelectItem value="C5">Competência 5</SelectItem>
              </SelectContent>
            </Select>

            <div className="text-sm text-gray-600 flex items-center">
              <Calendar className="w-4 h-4 mr-2" />
              {materiais?.length || 0} material(is) encontrado(s)
            </div>
          </div>
        </div>

        {!materiais || materiais.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <Home className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-600 mb-2">
                Nenhum material disponível
              </h3>
              <p className="text-gray-500">
                Não há materiais disponíveis para sua turma no momento.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6">
            {materiais.map((material) => (
              <Card key={material.id} className="border-l-4 border-l-redator-primary hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-xl mb-2">{material.titulo}</CardTitle>
                      {material.descricao && (
                        <p className="text-gray-600 mb-3">{material.descricao}</p>
                      )}
                      
                      <div className="flex flex-wrap gap-2 mb-4">
                        <Badge className="bg-redator-primary text-white">
                          {material.competencia}
                        </Badge>
                        <Badge variant="outline">
                          <Calendar className="w-3 h-3 mr-1" />
                          {format(new Date(material.data_publicacao), "dd/MM/yyyy", { locale: ptBR })}
                        </Badge>
                        {material.permite_visitante && (
                          <Badge variant="outline" className="text-redator-secondary">
                            Público
                          </Badge>
                        )}
                      </div>
                    </div>
                    
                    <div className="ml-4">
                      <Button
                        onClick={() => handleDownload(material.arquivo_url, material.arquivo_nome)}
                        className="bg-redator-primary hover:bg-redator-secondary"
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Baixar PDF
                      </Button>
                    </div>
                  </div>
                </CardHeader>
              </Card>
            ))}
          </div>
        )}
        </main>
        </div>
      </TooltipProvider>
    </ProtectedRoute>
  );
};

export default Biblioteca;
