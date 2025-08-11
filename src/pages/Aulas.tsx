import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StudentHeader } from "@/components/StudentHeader";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useStudentAuth } from "@/hooks/useStudentAuth";
import { supabase } from "@/integrations/supabase/client";
import { Search } from "lucide-react";
import { AlunoCard, AlunoCardSkeleton, type BadgeTone } from "@/components/aluno/AlunoCard";
import { resolveCover } from "@/utils/coverUtils";

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
      filtered = filtered.filter(aula =>
        aula.titulo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        aula.descricao.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (moduloFilter && moduloFilter !== "todos") {
      filtered = filtered.filter(aula => aula.modulo === moduloFilter);
    }

    console.log('📊 Resultado da filtragem:', { totalFiltradas: filtered.length });
    setFilteredAulas(filtered);
  };

  if (isLoading) {
    return (
      <ProtectedRoute>
        <TooltipProvider>
          <div className="min-h-screen bg-gradient-to-br from-purple-50 to-violet-100">
          <StudentHeader pageTitle="Aulas" />
          <div className="max-w-6xl mx-auto px-4 py-8 space-y-4">
            <AlunoCardSkeleton />
            <AlunoCardSkeleton />
            <AlunoCardSkeleton />
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
        <StudentHeader pageTitle="Aulas" />

        <main className="max-w-6xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8">
          <div className="text-center mb-6 sm:mb-8">
            <p className="text-base sm:text-lg text-redator-accent px-2">
              Acesse conteúdos educacionais organizados por competência
            </p>
          </div>

          {/* Filtros */}
          <Card className="mb-4 sm:mb-6 mx-1 sm:mx-0">
            <CardHeader className="pb-3 sm:pb-6">
              <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                <Search className="w-4 h-4 sm:w-5 sm:h-5" />
                Filtros
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <Input
                    placeholder="Buscar por título ou descrição..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="text-sm sm:text-base"
                  />
                </div>
                <div>
                  <Select value={moduloFilter} onValueChange={setModuloFilter}>
                    <SelectTrigger className="text-sm sm:text-base">
                      <SelectValue placeholder="Filtrar por módulo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todos os módulos</SelectItem>
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
          <div className="grid gap-4 sm:gap-6 mx-1 sm:mx-0">
            {filteredAulas.length === 0 ? (
              <Card>
                <CardContent className="text-center py-8 sm:py-12">
                  <h3 className="text-lg sm:text-xl font-semibold text-redator-primary mb-2">
                    Nenhuma aula disponível no momento.
                  </h3>
                  <p className="text-redator-accent text-sm sm:text-base">
                    Verifique novamente em breve ou entre em contato com sua coordenação.
                  </p>
                </CardContent>
              </Card>
            ) : (
filteredAulas.map((aula) => {
                const coverUrl = resolveCover((aula as any).cover_file_path, (aula as any).cover_url || (aula as any).imagem_capa_url);
                const tone: BadgeTone = aula.modulo === 'Aula ao vivo' ? 'warning' : 'primary';
                const badges = aula.modulo ? [{ label: aula.modulo, tone }] : [];
                return (
                  <AlunoCard
                    key={aula.id}
                    item={{
                      coverUrl,
                      title: aula.titulo,
                      subtitle: aula.descricao,
                      badges,
                      cta: { label: 'Acessar Aula', onClick: () => window.open(aula.link_conteudo, '_blank') },
                    }}
                  />
                );
              })
            )}
          </div>
        </main>
        </div>
      </TooltipProvider>
    </ProtectedRoute>
  );
};

export default Aulas;