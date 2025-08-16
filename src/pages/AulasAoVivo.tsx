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
  tipo_registro: 'entrada' | 'saida';
  data_registro: string;
}

const AulasAoVivo = () => {
  const { studentData } = useStudentAuth();
  const [aulas, setAulas] = useState<AulaAoVivo[]>([]);
  const [registrosPresenca, setRegistrosPresenca] = useState<RegistroPresenca[]>([]);
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

      // Buscar registros de presença do aluno
      if (studentData.userType === 'aluno' || studentData.userType === 'visitante') {
        const email = studentData.userType === 'visitante' 
          ? studentData.visitanteInfo?.email || 'visitante@exemplo.com'
          : 'aluno@exemplo.com';
        
        const turma = studentData.userType === 'visitante' ? 'visitante' : studentData.turma;

        const { data: presencaData, error: presencaError } = await supabase
          .from('presenca_aulas')
          .select('aula_id, tipo_registro, data_registro')
          .eq('email_aluno', email)
          .eq('turma', turma);

        if (presencaError) throw presencaError;
        setRegistrosPresenca((presencaData || []) as RegistroPresenca[]);
      }

    } catch (error: any) {
      console.error('Erro ao carregar aulas:', error);
      toast.error('Erro ao carregar aulas ao vivo');
    } finally {
      setIsLoading(false);
    }
  };

  const registrarPresenca = async (aulaId: string, tipo: 'entrada' | 'saida') => {
    try {
      const email = studentData.userType === 'visitante' 
        ? studentData.visitanteInfo?.email || 'visitante@exemplo.com'
        : 'aluno@exemplo.com';
      
      const turma = studentData.userType === 'visitante' ? 'visitante' : studentData.turma;
      const nomeCompleto = studentData.nomeUsuario || 'Usuário';
      const partesNome = nomeCompleto.split(' ');
      const nome = partesNome[0] || 'Usuário';
      const sobrenome = partesNome.slice(1).join(' ') || '';

      const { error } = await supabase
        .from('presenca_aulas')
        .insert([{
          aula_id: aulaId,
          nome_aluno: nome,
          sobrenome_aluno: sobrenome,
          email_aluno: email,
          turma: turma,
          tipo_registro: tipo
        }]);

      if (error) {
        if (error.code === '23505') {
          toast.error(`Você já registrou ${tipo} para esta aula`);
          return;
        }
        throw error;
      }

      const agora = new Date();
      const novoRegistro = {
        aula_id: aulaId,
        tipo_registro: tipo,
        data_registro: agora.toISOString()
      };

      setRegistrosPresenca(prev => [...prev, novoRegistro]);
      
      toast.success(`${tipo === 'entrada' ? 'Entrada' : 'Saída'} registrada às ${agora.toLocaleTimeString('pt-BR')}`);
    } catch (error: any) {
      console.error('Erro ao registrar presença:', error);
      toast.error('Erro ao registrar presença');
    }
  };

  const jaRegistrou = (aulaId: string, tipo: 'entrada' | 'saida') => {
    return registrosPresenca.some(r => r.aula_id === aulaId && r.tipo_registro === tipo);
  };

  const podeRegistrarSaida = (aula: AulaAoVivo) => {
    const TZ = 'America/Sao_Paulo';
    const agora = toZonedTime(new Date(), TZ);
    const fimAulaLocal = parse(`${aula.data_aula}T${aula.horario_fim}`, "yyyy-MM-dd'T'HH:mm", new Date());
    const dezMinutesAntes = subMinutes(fimAulaLocal, 10);
    return agora >= dezMinutesAntes;
  };

  const getStatusAula = (aula: AulaAoVivo) => {
    const agora = new Date();
    
    // Criar data/hora de início e fim em formato ISO
    const inicioISO = `${aula.data_aula}T${aula.horario_inicio}:00`;
    const fimISO = `${aula.data_aula}T${aula.horario_fim}:00`;
    
    // Converter para objetos Date (assumindo horário local)
    const inicioAula = new Date(inicioISO);
    const fimAula = new Date(fimISO);
    
    // Log para debug - REMOVER depois
    console.log('DEBUG Status Aula:', {
      titulo: aula.titulo,
      agora: agora.toISOString(),
      inicioAula: inicioAula.toISOString(),
      fimAula: fimAula.toISOString(),
      agoraTime: agora.getTime(),
      inicioTime: inicioAula.getTime(),
      fimTime: fimAula.getTime()
    });

    if (agora < inicioAula) {
      console.log('Status: FUTURA');
      return 'futura';
    }
    if (agora < fimAula) {
      console.log('Status: ANDAMENTO');
      return 'andamento';
    }
    console.log('Status: ENCERRADA');
    return 'encerrada';
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
              const entradaRegistrada = jaRegistrou(aula.id, 'entrada');
              const saidaRegistrada = jaRegistrou(aula.id, 'saida');
              const podeSaida = podeRegistrarSaida(aula);

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
                    {status === 'andamento' && (
                      <div className="absolute top-3 left-3 z-10">
                        <Badge variant="destructive" className="animate-pulse font-bold shadow-lg">
                          🔴 AO VIVO
                        </Badge>
                      </div>
                    )}
                  </div>
                  
                  <CardHeader className={`${
                    status === 'andamento' ? 'bg-red-50 border-b border-red-200' :
                    status === 'futura' ? 'bg-blue-50 border-b border-blue-200' :
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
                        status === 'andamento' ? 'destructive' :
                        status === 'futura' ? 'default' : 'secondary'
                      }>
                        {status === 'andamento' ? 'Em andamento' :
                         status === 'futura' ? 'Agendada' : 'Encerrada'}
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
                        variant={status === 'andamento' ? 'default' : 'outline'}
                        disabled={status === 'encerrada'}
                      >
                        <ExternalLink className="w-4 h-4 mr-2" />
                        {status === 'andamento' ? '🔴 Entrar na Aula' : 
                         status === 'futura' ? 'Aguardar na Sala' : 'Aula Encerrada'}
                      </Button>

                      {/* Botões de Presença */}
                      {(status === 'andamento' || status === 'encerrada') && (
                        <div className="flex flex-col sm:grid sm:grid-cols-2 gap-3">
                          <Button
                            onClick={() => registrarPresenca(aula.id, 'entrada')}
                            variant="outline"
                            disabled={entradaRegistrada}
                            className={`${entradaRegistrada ? 'bg-green-50 text-green-700' : ''} text-xs sm:text-sm`}
                          >
                            <LogIn className="w-4 h-4 mr-2 flex-shrink-0" />
                            <span className="truncate">{entradaRegistrada ? '✅ Entrada Registrada' : 'Registrar Entrada'}</span>
                          </Button>

                          <Button
                            onClick={() => registrarPresenca(aula.id, 'saida')}
                            variant="outline"
                            disabled={saidaRegistrada || !podeSaida}
                            className={`${saidaRegistrada ? 'bg-green-50 text-green-700' : ''} text-xs sm:text-sm`}
                          >
                            <LogOut className="w-4 h-4 mr-2 flex-shrink-0" />
                            <span className="truncate">{saidaRegistrada ? '✅ Saída Registrada' : 
                             !podeSaida ? 'Aguarde 10min antes do fim' : 'Registrar Saída'}</span>
                          </Button>
                        </div>
                      )}

                      {/* Status da presença */}
                      {(entradaRegistrada || saidaRegistrada) && (
                        <div className="bg-gray-50 p-3 rounded-md">
                          <p className="text-sm font-medium text-gray-700 mb-1">Status da Presença:</p>
                          <div className="flex gap-4 text-xs">
                            {entradaRegistrada && (
                              <span className="text-green-600">
                                ✅ Entrada: {registrosPresenca
                                  .find(r => r.aula_id === aula.id && r.tipo_registro === 'entrada')
                                  ?.data_registro && new Date(registrosPresenca
                                    .find(r => r.aula_id === aula.id && r.tipo_registro === 'entrada')!
                                    .data_registro).toLocaleTimeString('pt-BR')
                                }
                              </span>
                            )}
                            {saidaRegistrada && (
                              <span className="text-green-600">
                                ✅ Saída: {registrosPresenca
                                  .find(r => r.aula_id === aula.id && r.tipo_registro === 'saida')
                                  ?.data_registro && new Date(registrosPresenca
                                    .find(r => r.aula_id === aula.id && r.tipo_registro === 'saida')!
                                    .data_registro).toLocaleTimeString('pt-BR')
                                }
                              </span>
                            )}
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