import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Video } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useStudentAuth } from "@/hooks/useStudentAuth";
import { StudentHeader } from "@/components/StudentHeader";
import { toast } from "sonner";
import { computeStatus } from "@/utils/aulaStatus";
import { AulaAoVivoCardRefatorado } from "@/components/aula-virtual/AulaAoVivoCardRefatorado";
import { SkeletonCard } from "@/components/ui/skeleton-card";

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
}

interface RegistroPresenca {
  aula_id: string;
  entrada_at: string | null;
  saida_at: string | null;
}

const AulasAoVivo = () => {
  const { studentData } = useStudentAuth();
  const [aulas, setAulas] = useState<AulaAoVivo[]>([]);
  const [registrosPresencaMap, setRegistrosPresencaMap] = useState<Record<string, RegistroPresenca>>({});
  const [isLoading, setIsLoading] = useState(true);

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
          return aula.turmas_autorizadas.includes(studentData.turma);
        }
        return false;
      });

      setAulas(aulasAutorizadas);

      // Buscar registros de presença para cada aula autorizada
      for (const aula of aulasAutorizadas) {
        await fetchPresencaAula(aula.id);
      }
    } catch (error: any) {
      console.error('Erro ao carregar aulas:', error);
      toast.error('Erro ao carregar aulas ao vivo');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchPresencaAula = async (aulaId: string) => {
    try {
      if (!studentData.email) {
        return;
      }

      const { data, error } = await supabase
        .from('presenca_aulas')
        .select('aula_id, entrada_at, saida_at')
        .eq('aula_id', aulaId)
        .eq('email_aluno', studentData.email)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('Erro ao verificar presença:', error);
        return;
      }

      const registro = data || { aula_id: aulaId, entrada_at: null, saida_at: null };

      setRegistrosPresencaMap(prev => ({
        ...prev,
        [aulaId]: registro
      }));
    } catch (error: any) {
      console.error('Erro ao buscar presença:', error);
    }
  };

  const onRegistrarEntrada = async (aulaId: string) => {
    try {
      if (!studentData.email) {
        toast.error('Erro: dados do estudante não encontrados');
        return;
      }

      const { data, error } = await supabase.rpc('registrar_entrada_email_param', {
        p_aula_id: aulaId,
        p_email_aluno: studentData.email
      });

      if (error) {
        console.error('Erro ao registrar entrada:', error);
        toast.error('Erro ao registrar entrada.');
        return;
      }

      if (data === 'email_invalido') {
        toast.error('Email inválido');
      } else if (data === 'entrada_ok') {
        toast.success('Entrada registrada!');
      } else if (data === 'entrada_ja_registrada') {
        toast.info('Entrada já registrada');
      } else {
        toast.error('Não foi possível registrar a entrada.');
      }
      
      await fetchPresencaAula(aulaId);
    } catch (error: any) {
      console.error('Erro ao registrar entrada:', error);
      toast.error('Erro ao registrar entrada');
    }
  };

  const onRegistrarSaida = async (aulaId: string) => {
    try {
      if (!studentData.email) {
        toast.error('Erro: dados do estudante não encontrados');
        return;
      }

      const { data, error } = await supabase.rpc('registrar_saida_email_param', {
        p_aula_id: aulaId,
        p_email_aluno: studentData.email
      });

      if (error) {
        console.error('Erro ao registrar saída:', error);
        toast.error('Erro ao registrar saída.');
        return;
      }

      if (data === 'email_invalido') {
        toast.error('Email inválido');
      } else if (data === 'precisa_entrada') {
        toast.error('Registre a entrada primeiro.');
      } else if (data === 'saida_ja_registrada') {
        toast.info('Saída já registrada.');
      } else if (data === 'saida_ok') {
        toast.success('Saída registrada!');
      } else {
        toast.error('Não foi possível registrar a saída.');
      }
      
      await fetchPresencaAula(aulaId);
    } catch (error: any) {
      console.error('Erro ao registrar saída:', error);
      toast.error('Erro ao registrar saída');
    }
  };

  const getStatusAula = (aula: AulaAoVivo) => {
    return computeStatus({
      data_aula: aula.data_aula,
      horario_inicio: aula.horario_inicio,
      horario_fim: aula.horario_fim
    });
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
          <div className="text-center">
            <h1 className="text-3xl font-bold text-primary mb-2">Aulas ao Vivo</h1>
            <p className="text-muted-foreground">
              Participe das aulas ao vivo e registre sua frequência
            </p>
          </div>

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
                const registro = registrosPresencaMap[aula.id];

                // Normalizar status para garantir compatibilidade de tipos
                const normalizedStatus = status === 'indefinido' ? 'encerrada' : status;
                
                return (
                  <AulaAoVivoCardRefatorado
                    key={aula.id}
                    aula={aula}
                    status={normalizedStatus}
                    registro={registro}
                    turmaCode={studentData.turma || "Visitante"}
                    onEntrada={onRegistrarEntrada}
                    onSaida={onRegistrarSaida}
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