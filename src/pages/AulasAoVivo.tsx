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
import { PresenciaStatus } from "@/components/aula-virtual/PresenciaStatus";
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
    console.log('🔄 FETCH AULAS - Iniciando busca de aulas ao vivo...');
    try {
      setIsLoading(true);
      
      console.log('🔍 FETCH AULAS - Consultando tabela aulas_virtuais...');
      // Buscar aulas ao vivo ativas
      const { data: aulasData, error: aulasError } = await supabase
        .from('aulas_virtuais')
        .select('*')
        .eq('ativo', true)
        .eq('eh_aula_ao_vivo', true)
        .order('data_aula', { ascending: true });

      console.log('📥 FETCH AULAS - Dados retornados:', { aulasData, aulasError });

      if (aulasError) {
        console.error('❌ FETCH AULAS - Erro na consulta:', aulasError);
        throw aulasError;
      }

      console.log(`📊 FETCH AULAS - ${aulasData?.length || 0} aulas encontradas`);
      console.log('👤 FETCH AULAS - Dados do estudante:', studentData);

      // Filtrar aulas baseado na autorização
      const aulasAutorizadas = (aulasData || []).filter(aula => {
        console.log(`🔍 FETCH AULAS - Verificando autorização para aula: ${aula.titulo}`);
        console.log(`   - Permite visitante: ${aula.permite_visitante}`);
        console.log(`   - Turmas autorizadas: ${JSON.stringify(aula.turmas_autorizadas)}`);
        console.log(`   - Tipo usuário: ${studentData.userType}`);
        console.log(`   - Turma usuário: ${studentData.turma}`);
        
        if (aula.permite_visitante && studentData.userType === 'visitante') {
          console.log(`✅ FETCH AULAS - Aula ${aula.titulo} autorizada para visitante`);
          return true;
        }
        if (studentData.userType === 'aluno' && studentData.turma) {
          const autorizada = aula.turmas_autorizadas.includes(studentData.turma);
          console.log(`${autorizada ? '✅' : '❌'} FETCH AULAS - Aula ${aula.titulo} ${autorizada ? 'autorizada' : 'não autorizada'} para turma ${studentData.turma}`);
          return autorizada;
        }
        console.log(`❌ FETCH AULAS - Aula ${aula.titulo} não autorizada`);
        return false;
      });

      console.log(`📊 FETCH AULAS - ${aulasAutorizadas.length} aulas autorizadas`);
      setAulas(aulasAutorizadas);

      // Buscar registros de presença para cada aula autorizada
      console.log('🔄 FETCH AULAS - Buscando registros de presença...');
      for (const aula of aulasAutorizadas) {
        console.log(`🔍 FETCH AULAS - Buscando presença para aula: ${aula.titulo} (${aula.id})`);
        await fetchPresencaAula(aula.id);
      }

      console.log('✅ FETCH AULAS - Processo concluído');
    } catch (error: any) {
      console.error('💥 FETCH AULAS - Erro geral:', error);
      toast.error('Erro ao carregar aulas ao vivo');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchPresencaAula = async (aulaId: string) => {
    console.log('🔍 FETCH PRESENÇA - Iniciando para aula:', aulaId);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      console.log('🔍 FETCH PRESENÇA - Usuário:', user?.email);
      if (!user?.email) {
        console.log('❌ FETCH PRESENÇA - Usuário sem email, abortando');
        return;
      }

      console.log('🔄 FETCH PRESENÇA - Consultando tabela presenca_aulas...');
      const { data, error } = await supabase
        .from('presenca_aulas')
        .select('aula_id, entrada_at, saida_at')
        .eq('aula_id', aulaId)
        .eq('email_aluno', user.email)
        .maybeSingle();

      console.log('📥 FETCH PRESENÇA - Resposta da consulta:', { data, error });

      if (error && error.code !== 'PGRST116') {
        console.error('❌ FETCH PRESENÇA - Erro na consulta:', error);
        return;
      }

      const registro = data || { aula_id: aulaId, entrada_at: null, saida_at: null };
      console.log('📊 FETCH PRESENÇA - Registro final:', registro);

      setRegistrosPresencaMap(prev => ({
        ...prev,
        [aulaId]: registro
      }));
      
      console.log('✅ FETCH PRESENÇA - Estado atualizado para aula:', aulaId);
    } catch (error: any) {
      console.error('💥 FETCH PRESENÇA - Erro geral:', error);
    }
  };

  const onRegistrarEntrada = async (aulaId: string) => {
    console.log('🔄 ENTRADA - Botão clicado para aula:', aulaId);
    try {
      console.log('🔍 ENTRADA - Buscando usuário autenticado...');
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError) {
        console.error('❌ ENTRADA - Erro de autenticação:', authError);
        toast.error('Erro de autenticação');
        return;
      }
      
      if (!user) {
        console.log('❌ ENTRADA - Usuário não autenticado');
        toast.error('Faça login para registrar presença');
        return;
      }

      console.log('✅ ENTRADA - Usuário autenticado:', user.email);
      console.log('🔄 ENTRADA - Chamando RPC registrar_entrada_email...');

      const { data, error } = await supabase.rpc('registrar_entrada_email', {
        p_aula_id: aulaId
      });

      console.log('📥 ENTRADA - Resposta da RPC:', { data, error });

      if (error) {
        console.error('❌ ENTRADA - Erro na RPC:', error);
        toast.error('Erro ao registrar entrada.');
        return;
      }

      console.log('📊 ENTRADA - Data retornada:', data);

      if (data === 'usuario_nao_autenticado') {
        console.log('❌ ENTRADA - RPC retornou: usuario_nao_autenticado');
        toast.error('Faça login para registrar presença');
      } else if (data === 'entrada_ok') {
        console.log('✅ ENTRADA - RPC retornou: entrada_ok');
        toast.success('Entrada registrada!');
      } else if (data === 'entrada_ja_registrada') {
        console.log('ℹ️ ENTRADA - RPC retornou: entrada_ja_registrada');
        toast.info('Entrada já registrada');
      } else {
        console.log('❌ ENTRADA - RPC retornou valor inesperado:', data);
        toast.error('Não foi possível registrar a entrada.');
      }
      
      console.log('🔄 ENTRADA - Refazendo fetch da presença...');
      await fetchPresencaAula(aulaId);
      console.log('✅ ENTRADA - Processo concluído');
    } catch (error: any) {
      console.error('💥 ENTRADA - Erro geral:', error);
      toast.error('Erro ao registrar entrada');
    }
  };

  const onRegistrarSaida = async (aulaId: string) => {
    console.log('🔄 SAÍDA - Botão clicado para aula:', aulaId);
    try {
      console.log('🔍 SAÍDA - Buscando usuário autenticado...');
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError) {
        console.error('❌ SAÍDA - Erro de autenticação:', authError);
        toast.error('Erro de autenticação');
        return;
      }
      
      if (!user) {
        console.log('❌ SAÍDA - Usuário não autenticado');
        toast.error('Faça login para registrar presença');
        return;
      }

      console.log('✅ SAÍDA - Usuário autenticado:', user.email);
      console.log('🔄 SAÍDA - Chamando RPC registrar_saida_email...');

      const { data, error } = await supabase.rpc('registrar_saida_email', {
        p_aula_id: aulaId
      });

      console.log('📥 SAÍDA - Resposta da RPC:', { data, error });

      if (error) {
        console.error('❌ SAÍDA - Erro na RPC:', error);
        toast.error('Erro ao registrar saída.');
        return;
      }

      console.log('📊 SAÍDA - Data retornada:', data);

      if (data === 'usuario_nao_autenticado') {
        console.log('❌ SAÍDA - RPC retornou: usuario_nao_autenticado');
        toast.error('Faça login para registrar presença');
      } else if (data === 'precisa_entrada') {
        console.log('⚠️ SAÍDA - RPC retornou: precisa_entrada');
        toast.error('Registre a entrada primeiro.');
      } else if (data === 'saida_ja_registrada') {
        console.log('ℹ️ SAÍDA - RPC retornou: saida_ja_registrada');
        toast.info('Saída já registrada.');
      } else if (data === 'saida_ok') {
        console.log('✅ SAÍDA - RPC retornou: saida_ok');
        toast.success('Saída registrada!');
      } else {
        console.log('❌ SAÍDA - RPC retornou valor inesperado:', data);
        toast.error('Não foi possível registrar a saída.');
      }
      
      console.log('🔄 SAÍDA - Refazendo fetch da presença...');
      await fetchPresencaAula(aulaId);
      console.log('✅ SAÍDA - Processo concluído');
    } catch (error: any) {
      console.error('💥 SAÍDA - Erro geral:', error);
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
                       <PresenciaStatus 
                         entrada={registro?.entrada_at} 
                         saida={registro?.saida_at} 
                       />
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