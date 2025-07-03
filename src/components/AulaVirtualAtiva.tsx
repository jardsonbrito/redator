import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Video, Calendar, Clock, LogIn, LogOut, Users, ExternalLink } from "lucide-react";
import { format, parseISO, isWithinInterval, addHours } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useStudentAuth } from "@/hooks/useStudentAuth";
import { toast } from "sonner";

interface AulaVirtualAtivaProps {
  turmaCode: string;
}

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
  tipo_registro: 'entrada' | 'saida';
}

export const AulaVirtualAtiva = ({ turmaCode }: AulaVirtualAtivaProps) => {
  const { studentData } = useStudentAuth();
  const [registrosPresenca, setRegistrosPresenca] = useState<RegistroPresenca[]>([]);
  const [openDialog, setOpenDialog] = useState<{tipo: 'entrada' | 'saida', aulaId: string} | null>(null);
  const [formData, setFormData] = useState({
    nome: "",
    sobrenome: ""
  });

  const { data: aulaAtiva, isLoading } = useQuery({
    queryKey: ['aula-virtual-ativa', turmaCode],
    queryFn: async () => {
      try {
        const agora = new Date();
        const dataAtual = agora.toISOString().split('T')[0];

        console.log('Buscando aula virtual ativa para turma:', turmaCode);

        let query = supabase
          .from('aulas_virtuais')
          .select('*')
          .eq('ativo', true)
          .gte('data_aula', dataAtual)
          .order('data_aula', { ascending: true });

        // Filtrar por turma
        if (turmaCode === "Visitante") {
          query = query.contains('turmas_autorizadas', ['Visitante']);
        } else {
          query = query.contains('turmas_autorizadas', [turmaCode]);
        }
        
        const { data, error } = await query.limit(1);
        
        if (error) {
          console.error('Erro ao buscar aula virtual:', error);
          return null;
        }
        
        if (!data || data.length === 0) {
          console.log('Nenhuma aula virtual ativa encontrada');
          return null;
        }

        const aula = data[0];
        console.log('Aula virtual encontrada:', aula);

        // Verifica se a aula ainda está no período de exibição (até 1h após o fim)
        const fimAula = parseISO(`${aula.data_aula}T${aula.horario_fim}`);
        const fimEstendido = addHours(fimAula, 1);
        
        if (agora > fimEstendido) {
          console.log('Aula virtual já encerrada há mais de 1h, não será exibida');
          return null;
        }

        return aula;
      } catch (error) {
        console.error('Erro na busca de aula virtual:', error);
        return null;
      }
    },
    refetchInterval: 30000,
    retry: 2,
    staleTime: 0,
  });

  const fetchRegistrosPresenca = async () => {
    try {
      if (!studentData.visitanteInfo?.email && studentData.userType === 'visitante') return;
      
      const email = studentData.userType === 'visitante' 
        ? studentData.visitanteInfo?.email 
        : 'email_nao_disponivel';

      const { data, error } = await supabase
        .from('presenca_aulas')
        .select('aula_id, tipo_registro')
        .eq('email_aluno', email)
        .eq('turma', studentData.turma);

      if (error) throw error;
      setRegistrosPresenca((data || []) as RegistroPresenca[]);
    } catch (error: any) {
      console.error('Erro ao buscar registros de presença:', error);
    }
  };

  const registrarPresenca = async (tipo: 'entrada' | 'saida', aulaId: string) => {
    if (!formData.nome.trim() || !formData.sobrenome.trim()) {
      toast.error("Preencha nome e sobrenome");
      return;
    }

    try {
      const email = studentData.userType === 'visitante' 
        ? studentData.visitanteInfo?.email || 'visitante@exemplo.com'
        : 'aluno@exemplo.com';

      const { error } = await supabase
        .from('presenca_aulas')
        .insert([{
          aula_id: aulaId,
          nome_aluno: formData.nome.trim(),
          sobrenome_aluno: formData.sobrenome.trim(),
          email_aluno: email,
          turma: studentData.turma,
          tipo_registro: tipo
        }]);

      if (error) {
        if (error.code === '23505') {
          toast.error(`Você já registrou ${tipo} para esta aula`);
          return;
        }
        throw error;
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
      window.open(aula.link_meet, '_blank');
    }
  };

  const jaRegistrou = (aulaId: string, tipo: 'entrada' | 'saida') => {
    return registrosPresenca.some(r => r.aula_id === aulaId && r.tipo_registro === tipo);
  };

  const openPresencaDialog = (tipo: 'entrada' | 'saida', aulaId: string) => {
    setFormData({
      nome: studentData.nomeUsuario.split(' ')[0] || "",
      sobrenome: studentData.nomeUsuario.split(' ').slice(1).join(' ') || ""
    });
    setOpenDialog({ tipo, aulaId });
  };

  // Se não há aula ou está carregando, não renderiza nada
  if (isLoading || !aulaAtiva) {
    return null;
  }

  const agora = new Date();
  const inicioAula = parseISO(`${aulaAtiva.data_aula}T${aulaAtiva.horario_inicio}`);
  const fimAula = parseISO(`${aulaAtiva.data_aula}T${aulaAtiva.horario_fim}`);
  
  const aulaEmAndamento = isWithinInterval(agora, { start: inicioAula, end: fimAula });
  const aulaFutura = agora < inicioAula;
  const aulaEncerrada = agora > fimAula;

  const statusBadge = aulaEmAndamento 
    ? <Badge className="bg-red-500 text-white font-bold animate-pulse">AO VIVO</Badge>
    : aulaFutura 
    ? <Badge className="bg-blue-500 text-white">AGENDADA</Badge>
    : <Badge className="bg-gray-500 text-white">ENCERRADA</Badge>;

  const cardClass = aulaEmAndamento 
    ? "border-l-4 border-l-red-500 bg-gradient-to-r from-red-50 to-pink-50 shadow-xl"
    : aulaFutura 
    ? "border-l-4 border-l-blue-500 bg-gradient-to-r from-blue-50 to-cyan-50 shadow-lg"
    : "border-l-4 border-l-gray-500 bg-gradient-to-r from-gray-50 to-slate-50 shadow-lg";

  return (
    <div className="mb-8">
      <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-2xl overflow-hidden">
        <div className={`bg-gradient-to-r p-1 ${aulaEmAndamento ? 'from-red-400 to-pink-500' : aulaFutura ? 'from-blue-400 to-cyan-500' : 'from-gray-400 to-slate-500'}`}>
          <CardHeader className="bg-white/95 rounded-t-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <div className={`absolute inset-0 rounded-2xl blur ${aulaEmAndamento ? 'bg-red-400' : aulaFutura ? 'bg-blue-400' : 'bg-gray-400'} opacity-30`}></div>
                  <div className={`relative flex items-center justify-center w-16 h-16 rounded-2xl shadow-xl ${aulaEmAndamento ? 'bg-gradient-to-br from-red-500 to-pink-600' : aulaFutura ? 'bg-gradient-to-br from-blue-500 to-cyan-600' : 'bg-gradient-to-br from-gray-500 to-slate-600'}`}>
                    <Video className="w-8 h-8 text-white drop-shadow-lg" />
                  </div>
                </div>
                <div>
                  <CardTitle className={`text-2xl font-extrabold ${aulaEmAndamento ? 'text-red-700' : aulaFutura ? 'text-blue-700' : 'text-gray-700'}`}>
                    📺 {aulaAtiva.titulo}
                  </CardTitle>
                  <p className={`text-lg font-semibold ${aulaEmAndamento ? 'text-red-600' : aulaFutura ? 'text-blue-600' : 'text-gray-600'}`}>
                    {aulaAtiva.descricao || "Aula Virtual"}
                  </p>
                </div>
              </div>
              <div className="flex flex-col items-end gap-2">
                {statusBadge}
                {aulaEmAndamento && (
                  <div className="bg-red-100 text-red-800 px-3 py-1 rounded-full text-xs font-bold animate-pulse">
                    🔴 EM TRANSMISSÃO
                  </div>
                )}
              </div>
            </div>
          </CardHeader>
        </div>
        
        <CardContent className="space-y-6">
          <div className="bg-white p-5 rounded-lg border border-gray-200 shadow-sm">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm mb-4">
              <div className={`flex items-center gap-2 p-3 rounded-lg ${aulaEmAndamento ? 'text-red-700 bg-red-100' : aulaFutura ? 'text-blue-700 bg-blue-100' : 'text-gray-700 bg-gray-100'}`}>
                <Calendar className="w-5 h-5" />
                <span>
                  <strong>Data:</strong> {format(inicioAula, "dd/MM/yyyy", { locale: ptBR })}
                </span>
              </div>
              <div className={`flex items-center gap-2 p-3 rounded-lg ${aulaEmAndamento ? 'text-red-700 bg-red-100' : aulaFutura ? 'text-blue-700 bg-blue-100' : 'text-gray-700 bg-gray-100'}`}>
                <Clock className="w-5 h-5" />
                <span>
                  <strong>Horário:</strong> {aulaAtiva.horario_inicio} - {aulaAtiva.horario_fim}
                </span>
              </div>
              <div className={`flex items-center gap-2 p-3 rounded-lg ${aulaEmAndamento ? 'text-red-700 bg-red-100' : aulaFutura ? 'text-blue-700 bg-blue-100' : 'text-gray-700 bg-gray-100'}`}>
                <Users className="w-5 h-5" />
                <span>
                  <strong>Turma:</strong> {turmaCode === "Visitante" ? "Visitantes" : turmaCode}
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <Button 
              onClick={() => abrirAula(aulaAtiva)}
              className={`w-full font-bold text-lg py-3 shadow-lg transform hover:scale-105 transition-all duration-200 ${
                aulaEmAndamento 
                  ? 'bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-700 hover:to-pink-700' 
                  : aulaFutura 
                  ? 'bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700'
                  : 'bg-gradient-to-r from-gray-600 to-slate-600 hover:from-gray-700 hover:to-slate-700'
              } text-white`}
            >
              <Video className="w-6 h-6 mr-3" />
              {aulaAtiva.abrir_aba_externa && <ExternalLink className="w-4 h-4 mr-2" />}
              {aulaEmAndamento ? '🔴 ENTRAR NA AULA AO VIVO' : aulaFutura ? '📅 VER DETALHES DA AULA' : '📺 AULA ENCERRADA'}
            </Button>

            {(aulaEmAndamento || aulaEncerrada) && (
              <div className="grid grid-cols-2 gap-3">
                <Dialog open={openDialog?.tipo === 'entrada' && openDialog?.aulaId === aulaAtiva.id} onOpenChange={(open) => !open && setOpenDialog(null)}>
                  <DialogTrigger asChild>
                    <Button 
                      variant="outline" 
                      size="sm"
                      disabled={jaRegistrou(aulaAtiva.id, 'entrada')}
                      onClick={() => openPresencaDialog('entrada', aulaAtiva.id)}
                      className="w-full"
                    >
                      <LogIn className="w-4 h-4 mr-2" />
                      {jaRegistrou(aulaAtiva.id, 'entrada') ? 'Entrada Registrada' : 'Registrar Entrada'}
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Registrar Entrada na Aula</DialogTitle>
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
                        onClick={() => registrarPresenca('entrada', aulaAtiva.id)}
                        className="w-full"
                      >
                        Confirmar Entrada
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>

                <Dialog open={openDialog?.tipo === 'saida' && openDialog?.aulaId === aulaAtiva.id} onOpenChange={(open) => !open && setOpenDialog(null)}>
                  <DialogTrigger asChild>
                    <Button 
                      variant="outline" 
                      size="sm"
                      disabled={jaRegistrou(aulaAtiva.id, 'saida')}
                      onClick={() => openPresencaDialog('saida', aulaAtiva.id)}
                      className="w-full"
                    >
                      <LogOut className="w-4 h-4 mr-2" />
                      {jaRegistrou(aulaAtiva.id, 'saida') ? 'Saída Registrada' : 'Registrar Saída'}
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Registrar Saída da Aula</DialogTitle>
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
                        onClick={() => registrarPresenca('saida', aulaAtiva.id)}
                        className="w-full"
                      >
                        Confirmar Saída
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};