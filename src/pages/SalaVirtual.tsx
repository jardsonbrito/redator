import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StudentHeader } from "@/components/StudentHeader";
import { useStudentAuth } from "@/hooks/useStudentAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Video, Calendar, Clock, ExternalLink, LogIn, LogOut, Users } from "lucide-react";
import { format, parse, isWithinInterval, isBefore, isAfter } from "date-fns";
import { toZonedTime, fromZonedTime } from "date-fns-tz";
import { computeStatus } from "@/utils/aulaStatus";

interface AulaVirtual {
  id: string;
  titulo: string;
  descricao: string;
  data_aula: string;
  horario_inicio: string;
  horario_fim: string;
  turmas_autorizadas: string[];
  imagem_capa_url: string;
  link_meet: string;
  abrir_aba_externa: boolean;
  ativo: boolean;
}

interface RegistroPresenca {
  aula_id: string;
  aluno_id: string;
  entrada_at: string | null;
  saida_at: string | null;
}

const SalaVirtual = () => {
  const { studentData } = useStudentAuth();
  const [aulas, setAulas] = useState<AulaVirtual[]>([]);
  const [registrosPresenca, setRegistrosPresenca] = useState<RegistroPresenca[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState<{tipo: 'entrada' | 'saida', aulaId: string} | null>(null);
  const [formData, setFormData] = useState({
    nome: "",
    sobrenome: ""
  });

  const fetchAulas = async () => {
    try {
      setIsLoading(true);
      const turmaAluno = studentData.turma;
      
      const { data, error } = await supabase
        .from('aulas_virtuais')
        .select('*')
        .eq('ativo', true)
        .order('data_aula', { ascending: true });

      if (error) throw error;
      
      // Filtrar aulas pela turma do aluno
      const aulasAutorizadas = (data || []).filter(aula => 
        aula.turmas_autorizadas.includes(turmaAluno) || 
        aula.turmas_autorizadas.includes('Todas')
      );
      
      setAulas(aulasAutorizadas);
    } catch (error: any) {
      console.error('Erro ao buscar aulas:', error);
      toast.error('Erro ao carregar aulas virtuais');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchRegistrosPresenca = async () => {
    try {
      if (!studentData.visitanteInfo?.email && studentData.userType === 'visitante') return;
      
      const email = studentData.userType === 'visitante' 
        ? studentData.visitanteInfo?.email 
        : 'email_nao_disponivel'; // Para alunos sem email definido

      // Buscar o ID do aluno pelo email
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', email)
        .single();

      if (profile) {
        const { data, error } = await (supabase as any)
          .from('presenca_aulas')
          .select('*')
          .or(`aluno_id.eq.${profile.id},email_aluno.eq.${email}`);

        if (error) throw error;
        
        // Transformar dados para o formato esperado
        const transformedData = (data || []).map((record: any) => ({
          aula_id: record.aula_id,
          aluno_id: record.aluno_id || profile.id,
          entrada_at: record.entrada_at || null,
          saida_at: record.saida_at || null
        }));
        
        setRegistrosPresenca(transformedData as RegistroPresenca[]);
      }
    } catch (error: any) {
      console.error('Erro ao buscar registros de presença:', error);
    }
  };

  const registrarPresenca = async (tipo: 'entrada' | 'saida', aulaId: string, aulaData?: string, horarioInicio?: string, horarioFim?: string) => {
    if (!formData.nome.trim() || !formData.sobrenome.trim()) {
      toast.error("Preencha nome e sobrenome");
      return;
    }

    // Validar horários se fornecidos
    if (aulaData && horarioInicio && horarioFim) {
      if (tipo === 'entrada' && !podeRegistrarEntradaPorTempo(aulaData, horarioInicio, horarioFim)) {
        toast.error('A presença só pode ser registrada após o início da aula.');
        return;
      }
      
      if (tipo === 'saida' && !podeRegistrarSaidaPorTempo(aulaData, horarioInicio, horarioFim)) {
        toast.error('A saída só pode ser registrada de 10 minutos antes até 10 minutos depois do término da aula.');
        return;
      }
    }

    try {
      const email = studentData.userType === 'visitante' 
        ? studentData.visitanteInfo?.email || 'visitante@exemplo.com'
        : 'aluno@exemplo.com';
      
      const turma = studentData.userType === 'visitante' ? 'visitante' : studentData.turma;

      // Buscar ou criar o perfil do aluno
      let alunoId;
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', email)
        .single();

      if (profile) {
        alunoId = profile.id;
      } else {
        // Criar perfil se não existir
        const newId = crypto.randomUUID();
        const { data: newProfile, error: profileError } = await supabase
          .from('profiles')
          .insert([{
            id: newId,
            nome: formData.nome.trim(),
            sobrenome: formData.sobrenome.trim(),
            email: email,
            turma: turma,
            user_type: 'aluno'
          }])
          .select('id')
          .single();
        
        if (profileError) throw profileError;
        alunoId = newProfile.id;
      }

      if (tipo === 'entrada') {
        // Registrar entrada usando upsert
        const agora = new Date().toISOString();
        
        const { error } = await (supabase as any)
          .from('presenca_aulas')
          .upsert({
            aula_id: aulaId,
            aluno_id: alunoId,
            nome_aluno: formData.nome.trim(),
            sobrenome_aluno: formData.sobrenome.trim(),
            email_aluno: email,
            turma: turma,
            entrada_at: agora,
            data_registro: agora,
            tipo_registro: 'entrada'
          }, {
            onConflict: 'aula_id,aluno_id'
          });

        if (error) {
          console.error('Erro ao registrar entrada:', error);
          toast.error('Erro ao registrar entrada');
          return;
        }
      } else {
        // Registrar saída 
        const agora = new Date().toISOString();
        
        // Primeiro verificar se existe entrada
        const { data: existingRecords } = await (supabase as any)
          .from('presenca_aulas')
          .select('*')
          .eq('aula_id', aulaId)
          .eq('aluno_id', alunoId);

        const existingRecord = existingRecords?.[0] as any;
        if (!existingRecord || !(existingRecord as any).entrada_at) {
          toast.error('Entrada não registrada. Registre a entrada primeiro.');
          return;
        }

        if ((existingRecord as any).saida_at) {
          toast.error('Saída já registrada.');
          return;
        }

        // Atualizar com saída
        const { error } = await (supabase as any)
          .from('presenca_aulas')
          .update({ saida_at: agora })
          .eq('id', existingRecord.id);

        if (error) {
          console.error('Erro ao registrar saída:', error);
          toast.error('Erro ao registrar saída');
          return;
        }
      }

      toast.success(`${tipo === 'entrada' ? 'Entrada' : 'Saída'} registrada com sucesso!`);
      setOpenDialog(null);
      setFormData({ nome: "", sobrenome: "" });
      fetchRegistrosPresenca();
    } catch (error: any) {
      console.error('Erro ao registrar presença:', error);
      toast.error('Erro ao registrar presença');
    }
  };

  const abrirAula = (aula: AulaVirtual) => {
    if (aula.abrir_aba_externa) {
      window.open(aula.link_meet, '_blank');
    } else {
      // Implementar iframe se necessário
      window.open(aula.link_meet, '_blank');
    }
  };

  const jaRegistrou = (aulaId: string, tipo: 'entrada' | 'saida') => {
    const registro = registrosPresenca.find(r => r.aula_id === aulaId);
    if (!registro) return false;
    
    if (tipo === 'entrada') {
      return !!registro.entrada_at;
    } else {
      return !!registro.saida_at;
    }
  };

  const podeRegistrarSaida = (aulaId: string) => {
    // Só pode registrar saída se já tiver registrado entrada
    return jaRegistrou(aulaId, 'entrada') && !jaRegistrou(aulaId, 'saida');
  };

  const podeRegistrarEntradaPorTempo = (aulaData: string, horarioInicio: string, horarioFim: string) => {
    const agora = new Date();
    const inicioAula = new Date(`${aulaData}T${horarioInicio}`);
    const fimAula = new Date(`${aulaData}T${horarioFim}`);
    
    // Entrada permitida apenas a partir do início da aula até o fim
    return agora >= inicioAula && agora <= fimAula;
  };

  const podeRegistrarSaidaPorTempo = (aulaData: string, horarioInicio: string, horarioFim: string) => {
    const agora = new Date();
    const fimAula = new Date(`${aulaData}T${horarioFim}`);
    
    // Saída permitida de 10 minutos antes até 10 minutos depois do fim da aula
    const inicioSaidaPermitida = new Date(fimAula.getTime() - 10 * 60 * 1000); // 10 min antes
    const fimSaidaPermitida = new Date(fimAula.getTime() + 10 * 60 * 1000); // 10 min depois
    
    return agora >= inicioSaidaPermitida && agora <= fimSaidaPermitida;
  };

  const openPresencaDialog = (tipo: 'entrada' | 'saida', aulaId: string) => {
    setFormData({
      nome: studentData.nomeUsuario.split(' ')[0] || "",
      sobrenome: studentData.nomeUsuario.split(' ').slice(1).join(' ') || ""
    });
    setOpenDialog({ tipo, aulaId });
  };

  useEffect(() => {
    fetchAulas();
    fetchRegistrosPresenca();
  }, [studentData]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-secondary/20 via-secondary/10 to-secondary/5">
        <StudentHeader />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="text-sm text-muted-foreground mt-2">Carregando salas virtuais...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-secondary/20 via-secondary/10 to-secondary/5">
      <StudentHeader />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-primary mb-2">Sala Virtual</h1>
          <p className="text-muted-foreground">Acesse suas aulas ao vivo e registre sua presença</p>
        </div>

        {aulas.length === 0 ? (
          <Card>
            <CardContent className="text-center py-8">
              <Video className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">Nenhuma aula disponível</h3>
              <p className="text-muted-foreground">
                Não há aulas virtuais programadas para sua turma no momento.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {aulas.map((aula) => {
              const getAulaStatus = () => {
                return computeStatus({
                  data_aula: aula.data_aula,
                  horario_inicio: aula.horario_inicio,
                  horario_fim: aula.horario_fim
                });
              };

              const status = getAulaStatus();

              return (
                <Card key={aula.id} className="group hover:shadow-xl transition-all duration-300">
                  <CardHeader className="pb-4">
                    <div className="relative overflow-hidden bg-muted rounded-lg mb-4" style={{ aspectRatio: '3/2' }}>
                      <img 
                        src={aula.imagem_capa_url || "/placeholders/aula-cover.png"} 
                        alt={aula.titulo}
                        className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-300"
                        loading="lazy"
                        onError={(e) => {
                          e.currentTarget.src = "/placeholders/aula-cover.png";
                        }}
                      />
                    </div>
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="text-lg">{aula.titulo}</CardTitle>
                      <div className="flex flex-col gap-1">
                        <Badge variant={
                          status === 'ao_vivo' ? 'destructive' :
                          status === 'agendada' ? 'default' : 'secondary'
                        }>
                          {status === 'ao_vivo' ? 'Ao Vivo' :
                           status === 'agendada' ? 'Agendada' : 
                           status === 'encerrada' ? 'Encerrada' : 'Indefinido'}
                        </Badge>
                        <Badge variant={aula.abrir_aba_externa ? "default" : "secondary"} className="text-xs">
                          {aula.abrir_aba_externa ? <ExternalLink className="w-3 h-3" /> : <Video className="w-3 h-3" />}
                        </Badge>
                      </div>
                    </div>
                    {aula.descricao && (
                      <div className="text-sm text-muted-foreground mt-2 whitespace-pre-line">
                        {aula.descricao.trim().split(/\n{2,}/).map((para, i) => (
                          <p key={i} className={i > 0 ? 'mt-2' : ''}>{para}</p>
                        ))}
                      </div>
                    )}
                  </CardHeader>
                
                <CardContent className="space-y-4">
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-primary" />
                      <span>{new Date(aula.data_aula + 'T00:00:00').toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-primary" />
                      <span>{aula.horario_inicio} - {aula.horario_fim}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-primary" />
                      <span>{studentData.turma}</span>
                    </div>
                  </div>

                  <Button 
                    onClick={() => abrirAula(aula)}
                    className="w-full"
                    size="lg"
                    disabled={status === 'encerrada'}
                  >
                    <Video className="w-4 h-4 mr-2" />
                    {status === 'ao_vivo' ? 'Entrar na Aula' :
                     status === 'agendada' ? 'Aguardar na Sala' : 'Aula Encerrada'}
                  </Button>

                  <div className="flex flex-col sm:grid sm:grid-cols-2 gap-2">
                    <Dialog open={openDialog?.tipo === 'entrada' && openDialog?.aulaId === aula.id} onOpenChange={(open) => !open && setOpenDialog(null)}>
                      <DialogTrigger asChild>
                        <Button 
                          variant="outline" 
                          size="sm"
                          disabled={jaRegistrou(aula.id, 'entrada') || !podeRegistrarEntradaPorTempo(aula.data_aula, aula.horario_inicio, aula.horario_fim)}
                          onClick={() => openPresencaDialog('entrada', aula.id)}
                          className="w-full text-xs sm:text-sm"
                        >
                          <LogIn className="w-4 h-4 mr-1 flex-shrink-0" />
                          <span className="truncate">{jaRegistrou(aula.id, 'entrada') ? 'Entrada OK' : 'Registrar Entrada'}</span>
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Registrar Entrada</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div>
                            <Label htmlFor="nome">Nome</Label>
                            <Input
                              id="nome"
                              value={formData.nome}
                              onChange={(e) => setFormData(prev => ({ ...prev, nome: e.target.value }))}
                            />
                          </div>
                          <div>
                            <Label htmlFor="sobrenome">Sobrenome</Label>
                            <Input
                              id="sobrenome"
                              value={formData.sobrenome}
                              onChange={(e) => setFormData(prev => ({ ...prev, sobrenome: e.target.value }))}
                            />
                          </div>
                          <Button 
                            onClick={() => registrarPresenca('entrada', aula.id, aula.data_aula, aula.horario_inicio, aula.horario_fim)}
                            className="w-full"
                          >
                            Confirmar Entrada
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>

                    <Dialog open={openDialog?.tipo === 'saida' && openDialog?.aulaId === aula.id} onOpenChange={(open) => !open && setOpenDialog(null)}>
                      <DialogTrigger asChild>
                        <Button 
                          variant="outline" 
                          size="sm"
                          disabled={jaRegistrou(aula.id, 'saida') || !podeRegistrarSaida(aula.id) || !podeRegistrarSaidaPorTempo(aula.data_aula, aula.horario_inicio, aula.horario_fim)}
                          onClick={() => openPresencaDialog('saida', aula.id)}
                          className="w-full text-xs sm:text-sm"
                        >
                          <LogOut className="w-4 h-4 mr-1 flex-shrink-0" />
                          <span className="truncate">{jaRegistrou(aula.id, 'saida') ? 'Saída OK' : 
                            !jaRegistrou(aula.id, 'entrada') ? 'Registre entrada primeiro' : 
                            !podeRegistrarSaidaPorTempo(aula.data_aula, aula.horario_inicio, aula.horario_fim) ? 'Aguarde 10min antes do fim' : 'Registrar Saída'}</span>
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Registrar Saída</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div>
                            <Label htmlFor="nome">Nome</Label>
                            <Input
                              id="nome"
                              value={formData.nome}
                              onChange={(e) => setFormData(prev => ({ ...prev, nome: e.target.value }))}
                            />
                          </div>
                          <div>
                            <Label htmlFor="sobrenome">Sobrenome</Label>
                            <Input
                              id="sobrenome"
                              value={formData.sobrenome}
                              onChange={(e) => setFormData(prev => ({ ...prev, sobrenome: e.target.value }))}
                            />
                          </div>
                          <Button 
                            onClick={() => registrarPresenca('saida', aula.id, aula.data_aula, aula.horario_inicio, aula.horario_fim)}
                            className="w-full"
                          >
                            Confirmar Saída
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                </CardContent>
              </Card>
              )
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default SalaVirtual;