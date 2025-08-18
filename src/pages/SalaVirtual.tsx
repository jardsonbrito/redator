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
import { computeStatus } from "@/utils/aulaStatus";
import { usePresenca } from "@/components/aula-virtual/usePresenca";

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
  
  const {
    openDialog,
    setOpenDialog,
    formData,
    setFormData,
    registrarPresenca,
    jaRegistrou,
    openPresencaDialog
  } = usePresenca(registrosPresenca, setRegistrosPresenca);

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

  const abrirAula = (aula: AulaVirtual) => {
    window.open(aula.link_meet, '_blank');
  };

  useEffect(() => {
    fetchAulas();
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
                          disabled={jaRegistrou(aula.id, 'entrada')}
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
                            onClick={() => registrarPresenca('entrada', aula.id)}
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
                          onClick={() => openPresencaDialog('saida', aula.id)}
                          className="w-full text-xs sm:text-sm"
                        >
                          <LogOut className="w-4 h-4 mr-1 flex-shrink-0" />
                          <span className="truncate">
                            {jaRegistrou(aula.id, 'saida') ? 'Saída OK' : 'Registrar Saída'}
                          </span>
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
                            onClick={() => registrarPresenca('saida', aula.id)}
                            className="w-full"
                          >
                            Confirmar Saída
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>

                  {/* Status da Presença */}
                  {(jaRegistrou(aula.id, 'entrada') || jaRegistrou(aula.id, 'saida')) && (
                    <div className="bg-white/90 border rounded-lg p-4">
                      <h4 className="font-semibold text-gray-700 mb-2">Status da Presença:</h4>
                      {jaRegistrou(aula.id, 'entrada') && (
                        <div className="flex items-center gap-2 text-green-700 text-sm">
                          <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                          <span>✅ Entrada: {registrosPresenca.find(r => r.aula_id === aula.id)?.entrada_at && new Date(registrosPresenca.find(r => r.aula_id === aula.id)!.entrada_at!).toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo' })}</span>
                        </div>
                      )}
                      {jaRegistrou(aula.id, 'saida') && (
                        <div className="flex items-center gap-2 text-blue-700 text-sm mt-1">
                          <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                          <span>🚪 Saída: {registrosPresenca.find(r => r.aula_id === aula.id)?.saida_at && new Date(registrosPresenca.find(r => r.aula_id === aula.id)!.saida_at!).toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo' })}</span>
                        </div>
                      )}
                    </div>
                  )}
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