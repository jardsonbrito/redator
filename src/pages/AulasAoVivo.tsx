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
        console.log('fetchPresencaAula: studentData.email não encontrado');
        return;
      }

      console.log(`Buscando presença para aula ${aulaId} e email ${studentData.email}`);

      const { data, error } = await supabase
        .from('presenca_aulas')
        .select('aula_id, entrada_at, saida_at')
        .eq('aula_id', aulaId)
        .eq('email_aluno', studentData.email)
        .maybeSingle();

      console.log(`Resultado da busca de presença:`, { data, error });

      if (error && error.code !== 'PGRST116') {
        console.error('Erro ao verificar presença:', error);
        return;
      }

      const registro = data || { aula_id: aulaId, entrada_at: null, saida_at: null };

      console.log(`Registrando presença no state:`, registro);

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
        console.error('Erro: studentData.email não encontrado:', studentData);
        toast.error('Erro: dados do estudante não encontrados');
        return;
      }

      console.log('Iniciando registro de entrada:', { aulaId, email: studentData.email });

      // Obter token de sessão do cookie
      const getSessionToken = (): string | null => {
        const cookies = document.cookie.split(';');
        for (let cookie of cookies) {
          const [name, value] = cookie.trim().split('=');
          if (name === 'student_session_token') {
            return value;
          }
        }
        return null;
      };

      const sessionToken = getSessionToken();
      
      console.log('Token encontrado:', sessionToken ? 'Sim' : 'Não');
      
      if (!sessionToken) {
        console.error('Token de sessão não encontrado nos cookies');
        toast.error('Sessão expirada. Faça login novamente.');
        return;
      }

      console.log('Chamando RPC registrar_entrada_com_token:', { aulaId, sessionToken });

      const { data, error } = await supabase.rpc('registrar_entrada_com_token', {
        p_aula_id: aulaId,
        p_session_token: sessionToken
      });

      console.log('Resultado da RPC:', { data, error });

      if (error) {
        console.error('Erro ao registrar entrada:', error);
        toast.error('Erro ao registrar entrada');
        return;
      }

      switch (data) {
        case 'entrada_ok':
          console.log('Entrada registrada com sucesso, atualizando estado local');
          toast.success('Entrada registrada com sucesso!');
          // Atualizar estado local imediatamente
          const agora = new Date().toISOString();
          setRegistrosPresencaMap(prev => ({
            ...prev,
            [aulaId]: {
              aula_id: aulaId,
              entrada_at: agora,
              saida_at: prev[aulaId]?.saida_at || null
            }
          }));
          console.log('Estado local atualizado para entrada:', { aulaId, entrada_at: agora });
          break;
        case 'entrada_ja_registrada':
          console.log('Entrada já foi registrada');
          toast.info('Entrada já foi registrada anteriormente');
          break;
        case 'token_invalido_ou_expirado':
          console.error('Token inválido ou expirado');
          toast.error('Sessão expirada. Faça login novamente.');
          break;
        case 'aula_nao_encontrada':
          console.error('Aula não encontrada');
          toast.error('Aula não encontrada');
          break;
        case 'aula_nao_iniciou':
          console.log('Aula ainda não iniciou');
          toast.error('Aula ainda não iniciou (tolerância de 10 minutos antes)');
          break;
        case 'janela_encerrada':
          console.log('Janela de registro encerrada');
          toast.error('Janela de registro encerrada (30 minutos após o fim da aula)');
          break;
        default:
          console.error('Erro inesperado:', data);
          toast.error('Erro inesperado ao registrar entrada');
      }
      
      // Buscar dados atualizados do banco
      setTimeout(() => fetchPresencaAula(aulaId), 500);
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

      console.log('Iniciando registro de saída:', { aulaId, email: studentData.email });

      // Obter token de sessão do cookie
      const getSessionToken = (): string | null => {
        const cookies = document.cookie.split(';');
        for (let cookie of cookies) {
          const [name, value] = cookie.trim().split('=');
          if (name === 'student_session_token') {
            return value;
          }
        }
        return null;
      };

      const sessionToken = getSessionToken();
      
      if (!sessionToken) {
        toast.error('Sessão expirada. Faça login novamente.');
        return;
      }

      console.log('Chamando RPC registrar_saida_com_token:', { aulaId, sessionToken });

      const { data, error } = await supabase.rpc('registrar_saida_com_token', {
        p_aula_id: aulaId,
        p_session_token: sessionToken
      });

      console.log('Resultado da RPC de saída:', { data, error });

      if (error) {
        console.error('Erro ao registrar saída:', error);
        toast.error('Erro ao registrar saída');
        return;
      }

      switch (data) {
        case 'saida_ok':
          console.log('Saída registrada com sucesso, atualizando estado local');
          toast.success('Saída registrada com sucesso!');
          // Atualizar estado local imediatamente
          const agora = new Date().toISOString();
          setRegistrosPresencaMap(prev => ({
            ...prev,
            [aulaId]: {
              aula_id: aulaId,
              entrada_at: prev[aulaId]?.entrada_at || null,
              saida_at: agora
            }
          }));
          console.log('Estado local atualizado para saída:', { aulaId, saida_at: agora });
          break;
        case 'saida_ja_registrada':
          console.log('Saída já foi registrada');
          toast.info('Saída já foi registrada anteriormente');
          break;
        case 'token_invalido_ou_expirado':
          console.error('Token inválido ou expirado');
          toast.error('Sessão expirada. Faça login novamente.');
          break;
        case 'aula_nao_encontrada':
          console.error('Aula não encontrada');
          toast.error('Aula não encontrada');
          break;
        case 'aula_nao_iniciou':
          console.log('Aula ainda não iniciou');
          toast.error('Aula ainda não iniciou');
          break;
        case 'janela_encerrada':
          console.log('Janela de registro encerrada');
          toast.error('Janela de registro encerrada (30 minutos após o fim da aula)');
          break;
        case 'precisa_entrada':
          console.log('Precisa registrar entrada primeiro');
          toast.error('Registre a entrada primeiro');
          break;
        default:
          console.error('Erro inesperado:', data);
          toast.error('Erro inesperado ao registrar saída');
      }
      
      // Buscar dados atualizados do banco  
      setTimeout(() => fetchPresencaAula(aulaId), 500);
    } catch (error: any) {
      console.error('Erro ao registrar saída:', error);
      toast.error('Erro ao registrar saída');
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