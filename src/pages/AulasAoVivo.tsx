import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Video, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useStudentAuth } from "@/hooks/useStudentAuth";
import { StudentHeader } from "@/components/StudentHeader";
import { toast } from "sonner";
import { formatInTimeZone } from 'date-fns-tz';
import { computeStatus } from "@/utils/aulaStatus";
import { SkeletonCard } from "@/components/ui/skeleton-card";
import { StatusBadge } from "@/components/aula-virtual/StatusBadge";
import { getMyAttendanceStatus, registrarEntrada, AttendanceStatus } from "@/utils/attendanceHelpers";
import { AulaStatusBadge } from "@/components/aula-virtual/AulaStatusBadge";
import { AulaAoVivoCardRefatorado } from "@/components/aula-virtual/AulaAoVivoCardRefatorado";
import { usePageTitle } from "@/hooks/useBreadcrumbs";

interface AulaAoVivo {
  id: string;
  titulo: string;
  descricao?: string;
  data_aula: string;
  horario_inicio: string;
  horario_fim: string;
  link_meet: string;
  turmas_autorizadas: string[];
  permite_visitante: boolean;
  eh_aula_ao_vivo: boolean;
  ativo: boolean;
  imagem_capa_url?: string;
  status_transmissao?: string;
}

interface AttendanceRecord {
  session_id: string;
  status: AttendanceStatus;
}

const AulasAoVivo = () => {
  // Configurar título da página
  usePageTitle('Aulas ao Vivo');
  
  const { studentData } = useStudentAuth();
  const [aulas, setAulas] = useState<AulaAoVivo[]>([]);
  const [attendanceMap, setAttendanceMap] = useState<Record<string, AttendanceStatus>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [loadingOperations, setLoadingOperations] = useState<Record<string, boolean>>({});

  const fetchAulas = async () => {
    try {
      setIsLoading(true);
      
      // Buscar aulas ao vivo ativas
      const { data: aulasData, error: aulasError } = await supabase
        .from('aulas_virtuais')
        .select('*')
        .eq('ativo', true)
        .eq('eh_aula_ao_vivo', true)
        .order('data_aula', { ascending: true });

      if (aulasError) {
        throw aulasError;
      }

      // Filtrar aulas baseado na autorização
      const aulasAutorizadas = (aulasData || []).filter(aula => {
        if (aula.permite_visitante && studentData.userType === 'visitante') {
          return true;
        }
        if (studentData.userType === 'aluno' && studentData.turma) {
          // Fazer comparação case insensitive e sem considerar espaços extras
          const turmaAluno = studentData.turma.trim().toUpperCase();
          const turmasAutorizadas = aula.turmas_autorizadas.map(t => t.trim().toUpperCase());
          
          console.log('[DEBUG] Verificando autorização:', {
            turmaAluno,
            turmasAutorizadas,
            aula: aula.titulo,
            autorizado: turmasAutorizadas.includes(turmaAluno)
          });
          
          return turmasAutorizadas.includes(turmaAluno);
        }
        return false;
      });

      setAulas(aulasAutorizadas);

      // Buscar status de presença para cada aula autorizada
      for (const aula of aulasAutorizadas) {
        await fetchAttendanceStatus(aula.id);
      }
    } catch (error: any) {
      console.error('Erro ao carregar aulas:', error);
      toast.error('Erro ao carregar aulas ao vivo');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAttendanceStatus = async (sessionId: string) => {
    try {
      console.log('🔄 Buscando status de presença para aula:', sessionId);
      const status = await getMyAttendanceStatus(sessionId);
      console.log('📍 Status retornado para aula', sessionId, ':', status);
      setAttendanceMap(prev => ({
        ...prev,
        [sessionId]: status
      }));
    } catch (error) {
      console.error('Error fetching attendance status:', error);
    }
  };

  const handleRegistrarEntrada = async (sessionId: string) => {
    if (loadingOperations[sessionId]) return;

    setLoadingOperations(prev => ({ ...prev, [sessionId]: true }));
    
    try {
      await registrarEntrada(sessionId);
      
      // Update local state optimistically
      setAttendanceMap(prev => ({
        ...prev,
        [sessionId]: 'presente'
      }));
      
      const hora = formatInTimeZone(new Date(), 'America/Sao_Paulo', 'HH:mm');
      toast.success(`Entrada registrada às ${hora}`);
      
      // Refresh status from database
      setTimeout(() => fetchAttendanceStatus(sessionId), 500);
    } catch (error: any) {
      console.error('Error registering attendance:', error);
      
      if (error.message.includes('Fora do horário')) {
        toast.error('Só é possível registrar presença durante o horário da aula (10min antes até 15min após)');
      } else {
        toast.error('Erro ao registrar entrada. Tente novamente.');
      }
    } finally {
      setLoadingOperations(prev => ({ ...prev, [sessionId]: false }));
    }
  };

  const getStatusAula = (aula: AulaAoVivo) => {
    try {
      // Validação rigorosa dos dados
      if (!aula.data_aula || !aula.horario_inicio || !aula.horario_fim) {
        console.warn('❌ Dados da aula incompletos:', aula);
        return 'indefinido';
      }

      console.log('🎯 Processando aula:', {
        titulo: aula.titulo,
        data_aula: aula.data_aula,
        horario_inicio: aula.horario_inicio,
        horario_fim: aula.horario_fim
      });
      
      const status = computeStatus({
        data_aula: aula.data_aula, // Passa direto, computeStatus vai normalizar
        horario_inicio: aula.horario_inicio,
        horario_fim: aula.horario_fim
      });

      console.log(`🚀 Status final para "${aula.titulo}": ${status}`);
      
      return status;
    } catch (error) {
      console.error('❌ Erro em getStatusAula:', error, aula);
      return 'indefinido';
    }
  };

  useEffect(() => {
    fetchAulas();
  }, [studentData]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-violet-100">
        <StudentHeader pageTitle="Aulas ao Vivo" />
        <main className="container mx-auto px-4 py-8">
          <div className="max-w-6xl mx-auto space-y-6">
            <div className="text-center">
              <h1 className="text-3xl font-bold text-primary mb-2">Aulas ao Vivo</h1>
              <p className="text-muted-foreground">
                Participe das aulas ao vivo e registre sua frequência
              </p>
            </div>
            <div className="grid gap-4 md:gap-6">
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-violet-100">
      <StudentHeader pageTitle="Aulas ao Vivo" />
      
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto space-y-6">

          {aulas.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <Video className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">Nenhuma aula ao vivo disponível</h3>
                <p className="text-muted-foreground">
                  Não há aulas ao vivo programadas para sua turma no momento
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:gap-6">
              {aulas.map((aula) => {
                const status = getStatusAula(aula);
                const attendanceStatus = attendanceMap[aula.id] || 'ausente';

                console.log('🎯 Renderizando aula:', aula.titulo);
                console.log('   - ID da aula:', aula.id);
                console.log('   - Status calculado:', status);
                console.log('   - Attendance Map:', attendanceMap);
                console.log('   - Attendance Status:', attendanceStatus);

                // Usar status calculado dinamicamente (não o campo do banco)
                let normalizedStatus: 'agendada' | 'ao_vivo' | 'encerrada' = 
                  status === 'indefinido' ? 'encerrada' : status;
                
                return (
                  <AulaAoVivoCardRefatorado
                    key={aula.id}
                    aula={aula}
                    status={normalizedStatus}
                    attendanceStatus={attendanceStatus}
                    turmaCode={studentData.turma || "Visitante"}
                    onEntrada={handleRegistrarEntrada}
                    loadingOperation={loadingOperations[aula.id]}
                  />
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default AulasAoVivo;