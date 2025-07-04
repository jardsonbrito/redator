
import { useState } from "react";
import { Video, Clock, Users, Calendar, User } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { AulaVirtual } from "./types";
import { useStudentAuth } from "@/hooks/useStudentAuth";

interface AulaAoVivoCardProps {
  aula: AulaVirtual;
  turmaCode: string;
}

export const AulaAoVivoCard = ({ aula, turmaCode }: AulaAoVivoCardProps) => {
  const [dialogAberto, setDialogAberto] = useState<'entrada' | 'saida' | null>(null);
  const [nomeAluno, setNomeAluno] = useState("");
  const [turmaAluno, setTurmaAluno] = useState(turmaCode === "Visitante" ? "" : turmaCode);
  const [emailAluno, setEmailAluno] = useState("");
  const [jaRegistrouEntrada, setJaRegistrouEntrada] = useState(false);
  const [jaRegistrouSaida, setJaRegistrouSaida] = useState(false);
  const { toast } = useToast();
  const { studentData } = useStudentAuth();

  const verificarRegistrosExistentes = async () => {
    if (!emailAluno) return;
    
    try {
      const { data } = await supabase
        .from('presenca_aulas')
        .select('tipo_registro')
        .eq('aula_id', aula.id)
        .eq('email_aluno', emailAluno);

      if (data) {
        setJaRegistrouEntrada(data.some(r => r.tipo_registro === 'entrada'));
        setJaRegistrouSaida(data.some(r => r.tipo_registro === 'saida'));
      }
    } catch (error) {
      console.error('Erro ao verificar registros:', error);
    }
  };

  const registrarPresenca = async (tipo: 'entrada' | 'saida') => {
    if (!nomeAluno || !turmaAluno || !emailAluno) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha todos os campos obrigatórios.",
        variant: "destructive"
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('presenca_aulas')
        .insert({
          aula_id: aula.id,
          nome_aluno: nomeAluno,
          sobrenome_aluno: "", // Campo obrigatório mas pode ser vazio
          email_aluno: emailAluno,
          turma: turmaAluno,
          tipo_registro: tipo
        });

      if (error) throw error;

      toast({
        title: "Presença registrada!",
        description: `${tipo === 'entrada' ? 'Entrada' : 'Saída'} registrada com sucesso.`
      });

      if (tipo === 'entrada') {
        setJaRegistrouEntrada(true);
      } else {
        setJaRegistrouSaida(true);
      }

      setDialogAberto(null);
    } catch (error: any) {
      console.error('Erro ao registrar presença:', error);
      toast({
        title: "Erro ao registrar presença",
        description: error.message || "Ocorreu um erro inesperado.",
        variant: "destructive"
      });
    }
  };

  const abrirDialog = (tipo: 'entrada' | 'saida') => {
    // Auto-preencher dados quando possível
    if (studentData.userType === "aluno" && studentData.nome) {
      setNomeAluno(studentData.nome);
      setEmailAluno(studentData.email || "");
    }
    setDialogAberto(tipo);
    verificarRegistrosExistentes();
  };

  const isAgendada = aula.status_transmissao === 'agendada';
  const isEmTransmissao = aula.status_transmissao === 'em_transmissao';

  return (
    <div className="mb-8">
      <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-2xl overflow-hidden">
        <div className={`bg-gradient-to-r p-1 ${
          isEmTransmissao ? 'from-red-400 to-pink-500' : 'from-blue-400 to-cyan-500'
        }`}>
          <CardHeader className="bg-white/95 rounded-t-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <div className={`absolute inset-0 rounded-2xl blur ${
                    isEmTransmissao ? 'bg-red-400' : 'bg-blue-400'
                  } opacity-30`}></div>
                  <div className={`relative flex items-center justify-center w-16 h-16 rounded-2xl shadow-xl ${
                    isEmTransmissao 
                      ? 'bg-gradient-to-br from-red-500 to-pink-600' 
                      : 'bg-gradient-to-br from-blue-500 to-cyan-600'
                  }`}>
                    <Video className="w-8 h-8 text-white drop-shadow-lg" />
                  </div>
                </div>
                <div>
                  <CardTitle className={`text-2xl font-extrabold ${
                    isEmTransmissao ? 'text-red-700' : 'text-blue-700'
                  }`}>
                    📺 {aula.titulo}
                  </CardTitle>
                  <p className={`text-lg font-semibold ${
                    isEmTransmissao ? 'text-red-600' : 'text-blue-600'
                  }`}>
                    {aula.descricao || "Aula ao Vivo"}
                  </p>
                </div>
              </div>
              <div className="flex flex-col items-end gap-2">
                <Badge className={
                  isEmTransmissao 
                    ? "bg-red-100 text-red-800" 
                    : "bg-blue-100 text-blue-800"
                }>
                  {isEmTransmissao ? "🔴 EM TRANSMISSÃO" : "📅 AGENDADA"}
                </Badge>
                {isEmTransmissao && (
                  <div className="bg-red-100 text-red-800 px-3 py-1 rounded-full text-xs font-bold animate-pulse">
                    🔴 AO VIVO
                  </div>
                )}
              </div>
            </div>
          </CardHeader>
        </div>
        
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-gray-600" />
              <span className="text-sm font-medium">
                {new Date(aula.data_aula).toLocaleDateString('pt-BR')}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-gray-600" />
              <span className="text-sm font-medium">
                {aula.horario_inicio} - {aula.horario_fim}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-gray-600" />
              <span className="text-sm font-medium">
                {turmaCode === "Visitante" ? "Visitantes" : turmaCode}
              </span>
            </div>
          </div>

          <div className="space-y-4">
            {/* Botão para entrar na aula */}
            <Button 
              onClick={() => window.open(aula.link_meet, '_blank')}
              className={`w-full font-bold text-lg py-3 shadow-lg transform hover:scale-105 transition-all duration-200 ${
                isEmTransmissao 
                  ? 'bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-700 hover:to-pink-700' 
                  : 'bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700'
              } text-white`}
            >
              <Video className="w-6 h-6 mr-3" />
              {isEmTransmissao ? '🔴 ENTRAR NA AULA AO VIVO' : '🎥 Entre na sala e aguarde o professor'}
            </Button>

            {/* Botões de presença */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Dialog open={dialogAberto === 'entrada'} onOpenChange={(open) => !open && setDialogAberto(null)}>
                <DialogTrigger asChild>
                  <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={() => abrirDialog('entrada')}
                    disabled={jaRegistrouEntrada}
                  >
                    <User className="w-4 h-4 mr-2" />
                    {jaRegistrouEntrada ? "Entrada Registrada" : "Registrar Entrada"}
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Registrar Entrada na Aula</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="nome">Nome do Aluno *</Label>
                      <Input
                        id="nome"
                        value={nomeAluno}
                        onChange={(e) => setNomeAluno(e.target.value)}
                        placeholder="Digite seu nome completo"
                      />
                    </div>
                    <div>
                      <Label htmlFor="email">E-mail *</Label>
                      <Input
                        id="email"
                        type="email"
                        value={emailAluno}
                        onChange={(e) => setEmailAluno(e.target.value)}
                        placeholder="Digite seu e-mail"
                      />
                    </div>
                    <div>
                      <Label htmlFor="turma">Turma *</Label>
                      <Input
                        id="turma"
                        value={turmaAluno}
                        onChange={(e) => setTurmaAluno(e.target.value)}
                        placeholder="Digite sua turma"
                      />
                    </div>
                    <Button 
                      onClick={() => registrarPresenca('entrada')}
                      className="w-full"
                    >
                      Confirmar Entrada
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>

              {jaRegistrouEntrada && (
                <Dialog open={dialogAberto === 'saida'} onOpenChange={(open) => !open && setDialogAberto(null)}>
                  <DialogTrigger asChild>
                    <Button 
                      variant="outline" 
                      className="w-full"
                      onClick={() => abrirDialog('saida')}
                      disabled={jaRegistrouSaida}
                    >
                      <User className="w-4 h-4 mr-2" />
                      {jaRegistrouSaida ? "Saída Registrada" : "Registrar Saída"}
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Registrar Saída da Aula</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="nome">Nome do Aluno *</Label>
                        <Input
                          id="nome"
                          value={nomeAluno}
                          onChange={(e) => setNomeAluno(e.target.value)}
                          placeholder="Digite seu nome completo"
                        />
                      </div>
                      <div>
                        <Label htmlFor="email">E-mail *</Label>
                        <Input
                          id="email"
                          type="email"
                          value={emailAluno}
                          onChange={(e) => setEmailAluno(e.target.value)}
                          placeholder="Digite seu e-mail"
                        />
                      </div>
                      <div>
                        <Label htmlFor="turma">Turma *</Label>
                        <Input
                          id="turma"
                          value={turmaAluno}
                          onChange={(e) => setTurmaAluno(e.target.value)}
                          placeholder="Digite sua turma"
                        />
                      </div>
                      <Button 
                        onClick={() => registrarPresenca('saida')}
                        className="w-full"
                      >
                        Confirmar Saída
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
