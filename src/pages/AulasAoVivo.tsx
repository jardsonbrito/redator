import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Video } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useStudentAuth } from "@/hooks/useStudentAuth";
import { StudentHeader } from "@/components/StudentHeader";
import { toast } from "sonner";
import { formatInTimeZone } from 'date-fns-tz';
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
  status_transmissao?: string;
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
  const [loadingOperations, setLoadingOperations] = useState<Record<string, 'entrada' | 'saida' | null>>({});

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

  // Função helper para chamadas RPC com logging detalhado
  const rpc = async (fn: string, args: Record<string, any>): Promise<any> => {
    console.log('[RPC] call', fn, args);
    console.log('payload', { 
      emailSessao: studentData?.email, 
      aulaId: args.p_aula_id, 
      tipos: { 
        email: typeof studentData?.email, 
        aula: typeof args.p_aula_id 
      }
    });
    
    const { data, error } = await supabase.rpc(fn as any, args, { head: false });
    
    if (error) {
      console.error('[RPC] error', fn, error);
      toast.error(`Erro: ${error.message}`);
      throw error;
    }
    
    console.log('[RPC] data', fn, data);
    return data!;
  };

  const fetchPresencaAula = async (aulaId: string) => {
    if (!studentData?.email) return;

    try {
      console.log(`[PRESENCA] Verificando presença para aula ${aulaId} e email ${studentData.email}`);

      const data = await rpc('verificar_presenca', {
        p_email: studentData.email,
        p_aula_id: aulaId
      });

      const registro = data && data.length > 0 ? {
        aula_id: aulaId,
        entrada_at: data[0].entrada_at,
        saida_at: data[0].saida_at
      } : { aula_id: aulaId, entrada_at: null, saida_at: null };

      console.log(`[PRESENCA] Registro de presença:`, registro);

      setRegistrosPresencaMap(prev => ({
        ...prev,
        [aulaId]: registro
      }));
    } catch (error: any) {
      console.error('[PRESENCA] Erro ao buscar presença:', error);
    }
  };

  const onRegistrarEntrada = async (aulaId: string) => {
    if (!studentData?.email) {
      toast.error('Dados do estudante não encontrados');
      return;
    }

    // Verificar se já está em operação
    if (loadingOperations[aulaId]) {
      return;
    }

    setLoadingOperations(prev => ({ ...prev, [aulaId]: 'entrada' }));
    
    try {
      console.log('[ENTRADA] Iniciando registro de entrada');
      
      const data = await rpc('registrar_entrada', {
        p_email: studentData.email,
        p_aula_id: aulaId
      });

      console.log('[ENTRADA] Sucesso:', data);
      
      // Formatação de hora usando date-fns-tz
      const TZ = 'America/Sao_Paulo';
      const hora = formatInTimeZone(new Date(), TZ, 'HH:mm');
      
      toast.success(`Entrada registrada às ${hora}`);
      
      // Atualizar estado local com dados retornados
      if (data && data.length > 0) {
        setRegistrosPresencaMap(prev => ({
          ...prev,
          [aulaId]: {
            aula_id: aulaId,
            entrada_at: data[0].entrada_at,
            saida_at: data[0].saida_at
          }
        }));
      }
      
      // Buscar dados atualizados do banco
      setTimeout(() => fetchPresencaAula(aulaId), 500);
    } catch (error: any) {
      console.error('[ENTRADA] Erro:', error);
      // Error toast já foi mostrado pela função rpc
    } finally {
      setLoadingOperations(prev => ({ ...prev, [aulaId]: null }));
    }
  };

  const onRegistrarSaida = async (aulaId: string) => {
    if (!studentData?.email) {
      toast.error('Dados do estudante não encontrados');
      return;
    }

    // Verificar se já está em operação
    if (loadingOperations[aulaId]) {
      return;
    }

    setLoadingOperations(prev => ({ ...prev, [aulaId]: 'saida' }));
    
    try {
      console.log('[SAIDA] Iniciando registro de saída');
      
      const data = await rpc('registrar_saida', {
        p_email: studentData.email,
        p_aula_id: aulaId
      });

      console.log('[SAIDA] Sucesso:', data);
      
      // Formatação de hora usando date-fns-tz
      const TZ = 'America/Sao_Paulo';
      const hora = formatInTimeZone(new Date(), TZ, 'HH:mm');
      
      toast.success(`Saída registrada às ${hora}`);
      
      // Atualizar estado local com dados retornados
      if (data && data.length > 0) {
        setRegistrosPresencaMap(prev => ({
          ...prev,
          [aulaId]: {
            aula_id: aulaId,
            entrada_at: data[0].entrada_at,
            saida_at: data[0].saida_at
          }
        }));
      }
      
      // Buscar dados atualizados do banco
      setTimeout(() => fetchPresencaAula(aulaId), 500);
    } catch (error: any) {
      console.error('[SAIDA] Erro:', error);
      // Error toast já foi mostrado pela função rpc
    } finally {
      setLoadingOperations(prev => ({ ...prev, [aulaId]: null }));
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
                const registro = registrosPresencaMap[aula.id];

                // Usar status calculado dinamicamente (não o campo do banco)
                let normalizedStatus: 'agendada' | 'ao_vivo' | 'encerrada' = 
                  status === 'indefinido' ? 'encerrada' : status;

                console.log(`Aula ${aula.id}:`, {
                  titulo: aula.titulo,
                  data_aula: aula.data_aula,
                  horario_inicio: aula.horario_inicio,
                  horario_fim: aula.horario_fim,
                  status_calculado: status,
                  status_final: normalizedStatus,
                  registro: registro,
                  entrada_registrada: !!registro?.entrada_at,
                  saida_registrada: !!registro?.saida_at
                });
                
                return (
                  <AulaAoVivoCardRefatorado
                    key={aula.id}
                    aula={aula}
                    status={normalizedStatus}
                    registro={registro}
                    turmaCode={studentData.turma || "Visitante"}
                    onEntrada={onRegistrarEntrada}
                    onSaida={onRegistrarSaida}
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