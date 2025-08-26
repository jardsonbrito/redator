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
import { ExternalLink, Search, FileText, Edit, Home, Clock, Calendar } from "lucide-react";
import { ExerciseCard } from "@/components/ui/exercise-card";
import { getExerciseAvailability } from "@/utils/exerciseUtils";
import { useNavigate, Link } from "react-router-dom";
import { format, isWithinInterval, parse, isBefore } from "date-fns";
import { ptBR } from "date-fns/locale/pt-BR";
interface Exercicio {
  id: string;
  titulo: string;
  tipo: string;
  link_forms?: string;
  tema_id?: string;
  imagem_capa_url?: string;
  cover_url?: string;
  cover_upload_url?: string;
  cover_upload_path?: string;
  updated_at?: string;
  turmas_autorizadas: string[] | null;
  permite_visitante: boolean;
  ativo: boolean;
  criado_em: string;
  abrir_aba_externa?: boolean;
  data_inicio?: string;
  hora_inicio?: string;
  data_fim?: string;
  hora_fim?: string;
  temas?: {
    frase_tematica: string;
    eixo_tematico: string;
    cover_url?: string;
    cover_file_path?: string;
  };
}
const Exercicios = () => {
  const {
    studentData
  } = useStudentAuth();
  const navigate = useNavigate();
  const [exercicios, setExercicios] = useState<Exercicio[]>([]);
  const [filteredExercicios, setFilteredExercicios] = useState<Exercicio[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [tipoFilter, setTipoFilter] = useState("");
  const tiposDisponiveis = ['Google Forms', 'Redação com Frase Temática'];
  useEffect(() => {
    fetchExercicios();
  }, []);
  useEffect(() => {
    filterExercicios();
  }, [exercicios, searchTerm, tipoFilter]);
  const getExercicioStatus = (exercicio: Exercicio) => {
    if (!exercicio.data_inicio || !exercicio.hora_inicio || !exercicio.data_fim || !exercicio.hora_fim) {
      return 'disponivel'; // Exercícios sem data são sempre disponíveis se ativos
    }
    const agora = new Date();
    const inicioExercicio = parse(`${exercicio.data_inicio}T${exercicio.hora_inicio}`, "yyyy-MM-dd'T'HH:mm", new Date());
    const fimExercicio = parse(`${exercicio.data_fim}T${exercicio.hora_fim}`, "yyyy-MM-dd'T'HH:mm", new Date());
    if (isBefore(agora, inicioExercicio)) {
      return 'agendado';
    } else if (isWithinInterval(agora, {
      start: inicioExercicio,
      end: fimExercicio
    })) {
      return 'disponivel';
    } else {
      return 'encerrado';
    }
  };
  const handleExerciseAction = (exercicio: Exercicio) => {
    const availability = getExerciseAvailability(exercicio);
    
    if (availability.status === 'agendado') {
      alert('Este exercício ainda não está disponível. Aguarde a data de início.');
      return;
    }
    if (availability.status === 'encerrado') {
      alert('Este exercício está encerrado. Você pode visualizar a proposta, mas não pode mais respondê-lo.');
      return;
    }

    if (exercicio.tipo === 'Google Forms' && exercicio.link_forms) {
      if (exercicio.abrir_aba_externa) {
        window.open(exercicio.link_forms, '_blank');
      } else {
        // Modal embutido (mantendo lógica existente)
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
      }
    } else if (exercicio.tipo === 'Redação com Frase Temática' && exercicio.tema_id) {
      navigate(`/temas/${exercicio.tema_id}?exercicio=${exercicio.id}`);
    }
  };
  const fetchExercicios = async () => {
    try {
      const {
        data,
        error
      } = await supabase.from("exercicios").select(`
          *,
          temas (
            frase_tematica,
            eixo_tematico,
            cover_url,
            cover_file_path
          )
        `).eq("ativo", true);

      if (error) throw error;
      
      // Sort exercises: Available first (newest to oldest), then Ended (newest to oldest)
      const sortedExercicios = (data || []).sort((a, b) => {
        // Use the same status logic as ExerciseCard for consistency
        const availabilityA = getExerciseAvailability(a);
        const availabilityB = getExerciseAvailability(b);
        
        const statusA = availabilityA.status;
        const statusB = availabilityB.status;
        
        console.log(`${a.titulo}: status=${statusA}`);
        console.log(`${b.titulo}: status=${statusB}`);
        
        // Assign priority: disponivel = 0, agendado = 1, encerrado = 2
        const getPriority = (status: string) => {
          switch (status) {
            case 'disponivel': return 0; // Available exercises first
            case 'agendado': return 1;   // Scheduled in the middle
            case 'encerrado': return 2;  // Ended exercises last
            default: return 3;
          }
        };
        
        const priorityA = getPriority(statusA);
        const priorityB = getPriority(statusB);
        
        console.log(`Prioridades: ${a.titulo}=${priorityA}, ${b.titulo}=${priorityB}`);
        
        // If different priorities, sort by priority (Available -> Scheduled -> Ended)
        if (priorityA !== priorityB) {
          const result = priorityA - priorityB;
          console.log(`Resultado: ${result}`);
          return result;
        }
        
        // If same priority, sort by creation date DESCENDING (newest first within each group)
        return new Date(b.criado_em).getTime() - new Date(a.criado_em).getTime();
      });
      
      setExercicios(sortedExercicios);
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

      const isVisitante = studentData.userType === "visitante";
      const userTurma = studentData.turma;
      const turmasAutorizadas = exercicio.turmas_autorizadas || [];

      // REGRA 1: Visitante - só tem acesso se permite_visitante = true
      if (isVisitante) {
        const hasAccess = exercicio.permite_visitante;
        console.log('🎯 Visitante:', { hasAccess });
        return hasAccess;
      }

      // REGRA 2-4: Aluno - verificar turmas autorizadas
      if (!isVisitante && userTurma && userTurma !== "visitante") {
        // Se não há turmas autorizadas, só visitantes têm acesso (se permite_visitante = true)
        if (turmasAutorizadas.length === 0) {
          console.log('❌ Aluno sem turmas autorizadas');
          return false;
        }
        
        // Verificar se o aluno está em uma das turmas autorizadas
        const hasAccess = turmasAutorizadas.some(turma => 
          turma.toUpperCase() === userTurma.toUpperCase()
        );
        console.log('👤 Verificando acesso do aluno:', {
          userTurma,
          turmasAutorizadas,
          hasAccess
        });
        return hasAccess;
      }
      
      console.log('❌ Acesso negado');
      return false;
    });

    // Aplicar filtros de busca
    if (searchTerm) {
      filtered = filtered.filter(exercicio => exercicio.titulo.toLowerCase().includes(searchTerm.toLowerCase()));
    }
    if (tipoFilter && tipoFilter !== "todos") {
      filtered = filtered.filter(exercicio => exercicio.tipo === tipoFilter);
    }
    console.log('📊 Resultado da filtragem:', {
      totalFiltrados: filtered.length
    });
    setFilteredExercicios(filtered);
  };
  if (isLoading) {
    return <ProtectedRoute>
        <TooltipProvider>
          <div className="min-h-screen bg-gradient-to-br from-purple-50 to-violet-100">
            <StudentHeader pageTitle="Exercícios" />
            <div className="max-w-6xl mx-auto px-4 py-8">
              <div className="text-center py-8">Carregando exercícios...</div>
            </div>
          </div>
        </TooltipProvider>
      </ProtectedRoute>;
  }
  return <ProtectedRoute>
      <TooltipProvider>
        <div className="min-h-screen bg-gradient-to-br from-purple-50 to-violet-100">
        <StudentHeader pageTitle="Exercícios" />

        <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

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
                  <Input placeholder="Buscar por título..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                </div>
                <div>
                  <Select value={tipoFilter} onValueChange={setTipoFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="Filtrar por tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todos os tipos</SelectItem>
                      {tiposDisponiveis.map(tipo => <SelectItem key={tipo} value={tipo}>
                          {tipo}
                        </SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Lista de Exercícios */}
          <div className="space-y-6">
            {filteredExercicios.length === 0 ? (
              <Card>
                <CardContent className="text-center py-12">
                  <h3 className="text-xl font-semibold text-primary mb-2">
                    Nenhum exercício disponível no momento.
                  </h3>
                  <p className="text-muted-foreground">
                    Verifique novamente em breve ou entre em contato com sua coordenação.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div role="list" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                {filteredExercicios.map(exercicio => (
                  <ExerciseCard
                    key={exercicio.id}
                    exercise={exercicio}
                    onAction={handleExerciseAction}
                    showActions={true}
                    isAdmin={false}
                  />
                ))}
              </div>
            )}
          </div>
        </main>
      </div>
    </TooltipProvider>
  </ProtectedRoute>;
};
export default Exercicios;