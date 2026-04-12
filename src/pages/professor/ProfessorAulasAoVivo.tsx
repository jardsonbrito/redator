import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Video } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useProfessorAuth } from "@/hooks/useProfessorAuth";
import { StudentHeader } from "@/components/StudentHeader";
import { toast } from "sonner";
import { formatInTimeZone } from 'date-fns-tz';
import { SkeletonCard } from "@/components/ui/skeleton-card";
import { getMyAttendanceStatus, registrarEntrada, registrarSaida, AttendanceStatus } from "@/utils/attendanceHelpers";
import { computeStatus } from "@/utils/aulaStatus";
import { AulaCardPadrao } from "@/components/shared/AulaCardPadrao";
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
  aula_gravada_id?: string | null;
}

const ProfessorAulasAoVivo = () => {
  usePageTitle('Aulas ao Vivo');

  const { professor } = useProfessorAuth();
  const [aulas, setAulas] = useState<AulaAoVivo[]>([]);
  const [attendanceMap, setAttendanceMap] = useState<Record<string, AttendanceStatus>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [loadingOperations, setLoadingOperations] = useState<Record<string, boolean>>({});

  const getStatusAula = (aula: AulaAoVivo) => {
    try {
      if (!aula.data_aula || !aula.horario_inicio || !aula.horario_fim) return 'encerrada';
      return computeStatus({
        data_aula: aula.data_aula,
        horario_inicio: aula.horario_inicio,
        horario_fim: aula.horario_fim
      });
    } catch {
      return 'encerrada';
    }
  };

  const fetchAttendanceStatus = async (sessionId: string) => {
    try {
      const status = await getMyAttendanceStatus(sessionId);
      setAttendanceMap(prev => ({ ...prev, [sessionId]: status }));
    } catch (error) {
      console.error('Erro ao buscar status de presença:', error);
    }
  };

  const fetchAulas = async () => {
    try {
      setIsLoading(true);

      const { data: aulasData, error } = await supabase
        .from('aulas_virtuais')
        .select('*')
        .eq('ativo', true)
        .eq('eh_aula_ao_vivo', true)
        .order('data_aula', { ascending: false });

      if (error) throw error;

      // Filtrar aulas autorizadas para professor (valor "Professor" em turmas_autorizadas)
      const aulasAutorizadas = (aulasData || []).filter(aula => {
        const turmas = (aula.turmas_autorizadas || []).map((t: string) => t.trim().toUpperCase());
        return turmas.includes('PROFESSOR');
      });

      // Ordenar: ao vivo > agendada > encerrada
      const ordenadas = [...aulasAutorizadas].sort((a, b) => {
        const prioridade = { 'ao_vivo': 3, 'agendada': 2, 'encerrada': 1 };
        const pA = prioridade[getStatusAula(a) as keyof typeof prioridade] || 0;
        const pB = prioridade[getStatusAula(b) as keyof typeof prioridade] || 0;
        if (pA !== pB) return pB - pA;
        return new Date(b.data_aula).getTime() - new Date(a.data_aula).getTime();
      });

      setAulas(ordenadas);

      for (const aula of ordenadas) {
        await fetchAttendanceStatus(aula.id);
      }
    } catch (error: any) {
      console.error('Erro ao carregar aulas ao vivo:', error);
      toast.error('Erro ao carregar aulas ao vivo');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegistrarEntrada = async (sessionId: string) => {
    if (loadingOperations[sessionId]) return;
    setLoadingOperations(prev => ({ ...prev, [sessionId]: true }));
    try {
      await registrarEntrada(sessionId);
      setAttendanceMap(prev => ({ ...prev, [sessionId]: 'entrada_registrada' }));
      const hora = formatInTimeZone(new Date(), 'America/Sao_Paulo', 'HH:mm');
      toast.success(`Entrada registrada às ${hora}`);
      setTimeout(() => fetchAttendanceStatus(sessionId), 500);
    } catch (error: any) {
      console.error('Erro ao registrar entrada:', error);
      if (error.message?.includes('não identificado')) {
        toast.error('Erro de autenticação. Faça login novamente.');
      } else {
        toast.error(`Erro ao registrar entrada: ${error.message}`);
      }
    } finally {
      setLoadingOperations(prev => ({ ...prev, [sessionId]: false }));
    }
  };

  const handleRegistrarSaida = async (sessionId: string) => {
    if (loadingOperations[sessionId]) return;
    setLoadingOperations(prev => ({ ...prev, [sessionId]: true }));
    try {
      await registrarSaida(sessionId);
      setAttendanceMap(prev => ({ ...prev, [sessionId]: 'saida_registrada' }));
      const hora = formatInTimeZone(new Date(), 'America/Sao_Paulo', 'HH:mm');
      toast.success(`Saída registrada às ${hora}`);
      setTimeout(() => fetchAttendanceStatus(sessionId), 500);
    } catch (error: any) {
      console.error('Erro ao registrar saída:', error);
      if (error.message?.includes('não identificado')) {
        toast.error('Erro de autenticação. Faça login novamente.');
      } else {
        toast.error(`Erro ao registrar saída: ${error.message}`);
      }
    } finally {
      setLoadingOperations(prev => ({ ...prev, [sessionId]: false }));
    }
  };

  useEffect(() => {
    fetchAulas();
  }, [professor]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-violet-100">
        <StudentHeader pageTitle="Aulas ao Vivo" />
        <main className="container mx-auto px-4 py-8">
          <div className="max-w-6xl mx-auto space-y-6">
            <div className="text-center">
              <h1 className="text-3xl font-bold text-primary mb-2">Aulas ao Vivo</h1>
              <p className="text-muted-foreground">Participe das aulas ao vivo e registre sua frequência</p>
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
                  Não há aulas ao vivo marcadas como visíveis para professores no momento
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {aulas.map((aula) => {
                const attendanceStatus = attendanceMap[aula.id] || 'ausente';
                return (
                  <AulaCardPadrao
                    key={aula.id}
                    aula={aula}
                    perfil="professor"
                    attendanceStatus={attendanceStatus}
                    loadingOperation={loadingOperations[aula.id]}
                    actions={{
                      onEntrarAula: () => window.open(aula.link_meet, '_blank'),
                      onRegistrarEntrada: () => handleRegistrarEntrada(aula.id),
                      onRegistrarSaida: () => handleRegistrarSaida(aula.id),
                    }}
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

export default ProfessorAulasAoVivo;
