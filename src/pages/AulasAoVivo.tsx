import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Video, Clock, Calendar, Users, LogIn, LogOut, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useStudentAuth } from "@/hooks/useStudentAuth";
import { StudentHeader } from "@/components/StudentHeader";
import { toast } from "sonner";
import { parse, isWithinInterval, subMinutes, isBefore, isAfter } from "date-fns";
import { fromZonedTime, toZonedTime } from "date-fns-tz";
import { computeStatus } from "@/utils/aulaStatus";
import dayjs from 'dayjs';
import timezone from 'dayjs/plugin/timezone';
import utc from 'dayjs/plugin/utc';

dayjs.extend(utc);
dayjs.extend(timezone);

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

      if (aulasError) throw aulasError;

      // Filtrar aulas baseado na autorização
      const aulasAutorizadas = (aulasData || []).filter(aula => {
        if (aula.permite_visitante && studentData.userType === 'visitante') return true;
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
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.email) return;

      const { data, error } = await supabase
        .from('presenca_aulas')
        .select('aula_id, entrada_at, saida_at')
        .eq('aula_id', aulaId)
        .eq('email_aluno', user.email)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('Erro ao buscar presença:', error);
        return;
      }

      setRegistrosPresencaMap(prev => ({
        ...prev,
        [aulaId]: data || { aula_id: aulaId, entrada_at: null, saida_at: null }
      }));
    } catch (error: any) {
      console.error('Erro ao buscar presença:', error);
    }
  };

  const onRegistrarEntrada = async (aulaId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Faça login para registrar presença');
        return;
      }

      const emailAluno = user.email!;
      const turmaAluno = studentData?.turma ?? 'visitante';
      const nomeAluno = user.user_metadata?.full_name ?? studentData?.nomeUsuario ?? 'Aluno';

      const { data, error } = await supabase.rpc('registrar_entrada_email' as any, {
        p_aula_id: aulaId,
        p_email: emailAluno,
        p_nome: nomeAluno,
        p_turma: turmaAluno,
      });

      if (error) {
        console.error(error);
        toast.error('Erro ao registrar entrada.');
        return;
      }

      if (data === 'entrada_ok') {
        toast.success('Entrada registrada!');
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
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Faça login para registrar presença');
        return;
      }

      const emailAluno = user.email!;

      const { data, error } = await supabase.rpc('registrar_saida_email' as any, {
        p_aula_id: aulaId,
        p_email: emailAluno,
      });

      if (error) {
        console.error(error);
        toast.error('Erro ao registrar saída.');
        return;
      }

      if (data === 'precisa_entrada') {
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

  const formatTimestamp = (iso?: string | null) =>
    iso ? dayjs(iso).tz('America/Sao_Paulo').format('HH:mm:ss') : '—';

  const podeRegistrarSaida = (aula: AulaAoVivo) => {
    const TZ = 'America/Sao_Paulo';
    const agora = toZonedTime(new Date(), TZ);
    const inicioAulaLocal = parse(`${aula.data_aula}T${aula.horario_inicio}`, "yyyy-MM-dd'T'HH:mm", new Date());
    return agora >= inicioAulaLocal;
  };

  const getStatusAula = (aula: AulaAoVivo) => {
    return computeStatus({
      data_aula: aula.data_aula,
      horario_inicio: aula.horario_inicio,
      horario_fim: aula.horario_fim
    });
  };

  const abrirAula = (aula: AulaAoVivo) => {
    window.open(aula.link_meet, '_blank');
  };

  useEffect(() => {
    fetchAulas();
  }, [studentData]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-secondary/20 via-secondary/10 to-secondary/5 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="text-sm text-muted-foreground mt-2">Carregando aulas ao vivo...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-violet-100">
      <StudentHeader pageTitle="Aulas ao Vivo" />
      
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto space-y-6">
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
          <div className="grid gap-6">
            {aulas.map((aula) => {
              const status = getStatusAula(aula);
              const registro = registrosPresencaMap[aula.id];
              const entradaRegistrada = !!registro?.entrada_at;
              const saidaRegistrada = !!registro?.saida_at;

              return (
                <Card key={aula.id} className="overflow-hidden relative">
                  {/* Capa da Aula */}
                  <div className="relative overflow-hidden bg-muted" style={{ aspectRatio: '3/2' }}>
                    <img 
                      src={aula.imagem_capa_url || "/placeholders/aula-cover.png"} 
                      alt={aula.titulo}
                      className="w-full h-full object-cover object-center"
                      loading="lazy"
                      onError={(e) => {
                        e.currentTarget.src = "/placeholders/aula-cover.png";
                      }}
                    />
                    {status === 'ao_vivo' && (
                      <div className="absolute top-3 left-3 z-10">
                        <Badge variant="destructive" className="animate-pulse font-bold shadow-lg">
                          🔴 AO VIVO
                        </Badge>
                      </div>
                    )}
                  </div>
                  
                  <CardHeader className={`${
                    status === 'ao_vivo' ? 'bg-red-50 border-b border-red-200' :
                    status === 'agendada' ? 'bg-blue-50 border-b border-blue-200' :
                    'bg-gray-50 border-b border-gray-200'
                  }`}>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-xl flex items-center gap-2">
                          <Video className="w-5 h-5" />
                          {aula.titulo}
                        </CardTitle>
                        {aula.descricao && (
                          <div className="text-muted-foreground mt-1 whitespace-pre-line">
                            {aula.descricao.trim().split(/\n{2,}/).map((para, i) => (
                              <p key={i} className={i > 0 ? 'mt-2' : ''}>{para}</p>
                            ))}
                          </div>
                        )}
                      </div>
                      <Badge variant={
                        status === 'ao_vivo' ? 'destructive' :
                        status === 'agendada' ? 'default' : 'secondary'
                      }>
                        {status === 'ao_vivo' ? 'Ao Vivo' :
                         status === 'agendada' ? 'Agendada' : 
                         status === 'encerrada' ? 'Encerrada' : 'Indefinido'}
                      </Badge>
                    </div>
                  </CardHeader>

                  <CardContent className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-muted-foreground" />
                        <span>{new Date(aula.data_aula + 'T00:00:00').toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-muted-foreground" />
                        <span>{aula.horario_inicio} - {aula.horario_fim}</span>
                      </div>
                    </div>

                    <div className="space-y-3">
                      {/* Botão Participar */}
                      <Button 
                        onClick={() => abrirAula(aula)}
                        className="w-full"
                        variant={status === 'ao_vivo' ? 'default' : 'outline'}
                        disabled={status === 'encerrada'}
                      >
                        <ExternalLink className="w-4 h-4 mr-2" />
                        {status === 'ao_vivo' ? '🔴 Entrar na Aula' : 
                         status === 'agendada' ? 'Aguardar na Sala' : 'Aula Encerrada'}
                      </Button>

                      {/* Botões de Presença */}
                      {(status === 'ao_vivo' || status === 'encerrada') && (
                        <div className="flex flex-col sm:grid sm:grid-cols-2 gap-3">
                          <Button
                            onClick={() => onRegistrarEntrada(aula.id)}
                            variant="outline"
                            disabled={entradaRegistrada}
                            className={`${entradaRegistrada ? 'bg-green-50 text-green-700' : ''} text-xs sm:text-sm`}
                          >
                            <LogIn className="w-4 h-4 mr-2 flex-shrink-0" />
                            <span className="truncate">{entradaRegistrada ? 'Entrada Registrada' : 'Registrar Entrada'}</span>
                          </Button>

                          <Button
                            onClick={() => onRegistrarSaida(aula.id)}
                            variant="outline"
                            disabled={saidaRegistrada}
                            className={`${saidaRegistrada ? 'bg-green-50 text-green-700' : ''} text-xs sm:text-sm`}
                          >
                            <LogOut className="w-4 h-4 mr-2 flex-shrink-0" />
                            <span className="truncate">{saidaRegistrada ? 'Saída Registrada' : 'Registrar Saída'}</span>
                          </Button>
                        </div>
                      )}

                      {/* Status da presença */}
                      {(entradaRegistrada || saidaRegistrada) && (
                        <div className="bg-gray-50 p-3 rounded-md">
                          <p className="text-sm font-medium text-gray-700 mb-1">Status da Presença:</p>
                          <div className="flex gap-4 text-xs">
                            <div>Entrada: {formatTimestamp(registro?.entrada_at)}</div>
                            <div>Saída: {formatTimestamp(registro?.saida_at)}</div>
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
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