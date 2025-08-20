
import { useState, useEffect } from "react";
import { Video, Clock, Users, Calendar, User } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { AulaVirtual } from "./types";
import { useStudentAuth } from "@/hooks/useStudentAuth";
import { PresenciaStatus } from "./PresenciaStatus";

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
  const [timestampEntrada, setTimestampEntrada] = useState<string | null>(null);
  const [timestampSaida, setTimestampSaida] = useState<string | null>(null);
  const { toast } = useToast();
  const { studentData } = useStudentAuth();

  // Verificar registros existentes ao carregar o componente
  useEffect(() => {
    if (studentData.email) {
      verificarRegistrosExistentes();
    }
  }, [studentData.email, aula.id]);

  const verificarRegistrosExistentes = async () => {
    try {
      if (!studentData.email) return;

      const { data, error } = await supabase
        .from('presenca_aulas')
        .select('entrada_at, saida_at')
        .eq('aula_id', aula.id)
        .eq('email_aluno', studentData.email)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('Erro ao verificar registros:', error);
        return;
      }

      if (data) {
        setJaRegistrouEntrada(!!data.entrada_at);
        setJaRegistrouSaida(!!data.saida_at);
        setTimestampEntrada(data.entrada_at);
        setTimestampSaida(data.saida_at);
      }
    } catch (error) {
      console.error('Erro ao verificar registros:', error);
    }
  };

  const registrarPresenca = async (tipo: 'entrada' | 'saida') => {
    try {
      if (!studentData.email) {
        toast({
          title: "Erro",
          description: "Dados do estudante não encontrados. Faça login novamente.",
          variant: "destructive"
        });
        return;
      }

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
        toast({
          title: "Erro",
          description: "Sessão expirada. Faça login novamente.",
          variant: "destructive"
        });
        return;
      }

      if (tipo === 'entrada') {
        const { data, error } = await supabase.rpc('registrar_entrada_com_token', {
          p_aula_id: aula.id,
          p_session_token: sessionToken
        });

        if (error) {
          console.error('Erro ao registrar entrada:', error);
          toast({
            title: "Erro ao registrar entrada",
            description: error.message || "Ocorreu um erro inesperado.",
            variant: "destructive"
          });
          return;
        }

        switch (data) {
          case 'entrada_ok':
            toast({
              title: "Presença registrada!",
              description: "Entrada registrada com sucesso."
            });
            setJaRegistrouEntrada(true);
            setTimestampEntrada(new Date().toISOString());
            // Atualizar dados do banco para ter timestamps precisos
            setTimeout(() => verificarRegistrosExistentes(), 500);
            break;
          case 'entrada_ja_registrada':
            toast({
              title: "Informação",
              description: "Entrada já registrada."
            });
            break;
          case 'token_invalido_ou_expirado':
            toast({
              title: "Erro",
              description: "Sessão expirada. Faça login novamente.",
              variant: "destructive"
            });
            break;
          case 'aula_nao_encontrada':
            toast({
              title: "Erro",
              description: "Aula não encontrada.",
              variant: "destructive"
            });
            break;
          case 'aula_nao_iniciou':
            toast({
              title: "Erro",
              description: "Aula ainda não iniciou (tolerância de 10 minutos).",
              variant: "destructive"
            });
            break;
          case 'janela_encerrada':
            toast({
              title: "Erro",
              description: "Janela de registro encerrada.",
              variant: "destructive"
            });
            break;
          default:
            toast({
              title: "Erro",
              description: "Não foi possível registrar a entrada.",
              variant: "destructive"
            });
        }
      } else {
        const { data, error } = await supabase.rpc('registrar_saida_com_token', {
          p_aula_id: aula.id,
          p_session_token: sessionToken
        });

        if (error) {
          console.error('Erro ao registrar saída:', error);
          toast({
            title: "Erro ao registrar saída",
            description: error.message || "Ocorreu um erro inesperado.",
            variant: "destructive"
          });
          return;
        }

        switch (data) {
          case 'saida_ok':
            toast({
              title: "Presença registrada!",
              description: "Saída registrada com sucesso."
            });
            setJaRegistrouSaida(true);
            setTimestampSaida(new Date().toISOString());
            // Atualizar dados do banco para ter timestamps precisos
            setTimeout(() => verificarRegistrosExistentes(), 500);
            break;
          case 'saida_ja_registrada':
            toast({
              title: "Informação",
              description: "Saída já registrada."
            });
            break;
          case 'token_invalido_ou_expirado':
            toast({
              title: "Erro",
              description: "Sessão expirada. Faça login novamente.",
              variant: "destructive"
            });
            break;
          case 'aula_nao_encontrada':
            toast({
              title: "Erro",
              description: "Aula não encontrada.",
              variant: "destructive"
            });
            break;
          case 'aula_nao_iniciou':
            toast({
              title: "Erro",
              description: "Aula ainda não iniciou.",
              variant: "destructive"
            });
            break;
          case 'janela_encerrada':
            toast({
              title: "Erro",
              description: "Janela de registro encerrada.",
              variant: "destructive"
            });
            break;
          case 'precisa_entrada':
            toast({
              title: "Erro",
              description: "Registre a entrada primeiro.",
              variant: "destructive"
            });
            break;
          default:
            toast({
              title: "Erro",
              description: "Não foi possível registrar a saída.",
              variant: "destructive"
            });
        }
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
    // Verificar se há dados do estudante (sistema local, não Supabase Auth)
    if (!studentData.email) {
      toast({
        title: "Erro",
        description: "Dados do estudante não encontrados. Faça login novamente.",
        variant: "destructive"
      });
      return;
    }
    
    // Auto-preencher dados quando possível
    if (studentData.userType === "aluno" && studentData.nomeUsuario) {
      setNomeAluno(studentData.nomeUsuario);
      setEmailAluno(studentData.email || "");
    } else if (studentData.userType === "visitante" && studentData.visitanteInfo) {
      setNomeAluno(studentData.visitanteInfo.nome);
      setEmailAluno(studentData.visitanteInfo.email);
    }
    setDialogAberto(tipo);
  };

  const isAgendada = aula.status_transmissao === 'agendada';
  const isEmTransmissao = aula.status_transmissao === 'em_transmissao';

  return (
    <Card className="rounded-2xl shadow-sm border bg-card p-4 md:p-5 hover:shadow-md transition-shadow duration-300 mb-8">
      <div className="grid md:grid-cols-[320px_minmax(0,1fr)] gap-4 md:gap-5 items-start">
        {/* Thumbnail/Capa */}
        <div className="relative w-full aspect-video overflow-hidden rounded-xl">
          <img
            src={aula.imagem_capa_url || "/placeholders/aula-cover.png"}
            alt={`Capa da aula: ${aula.titulo}`}
            className="absolute inset-0 w-full h-full object-cover hover:scale-105 transition-transform duration-300"
            onError={(e) => {
              e.currentTarget.src = "/placeholders/aula-cover.png";
            }}
          />
          
          {/* Status badge overlay */}
          {isEmTransmissao && (
            <div className="absolute top-3 left-3">
              <Badge variant="destructive" className="bg-red-600 text-white animate-pulse font-bold shadow-lg">
                🔴 AO VIVO
              </Badge>
            </div>
          )}
        </div>

        {/* Conteúdo */}
        <div className="flex flex-col gap-3">
          {/* Badges e Status */}
          <div className="flex flex-wrap items-center gap-2">
            <Badge className={
              isEmTransmissao 
                ? "bg-red-600 text-white animate-pulse" 
                : "bg-blue-600 text-white"
            }>
              {isEmTransmissao ? "🔴 AO VIVO" : "📅 AGENDADA"}
            </Badge>
            <Badge variant="outline" className="text-xs">Google Meet</Badge>
            {turmaCode && turmaCode !== "Visitante" && (
              <Badge variant="outline" className="text-xs">{turmaCode}</Badge>
            )}
          </div>

          {/* Título */}
          <h3 className="text-lg md:text-xl font-semibold leading-tight text-foreground">
            📺 {aula.titulo}
          </h3>

          {/* Descrição */}
          {aula.descricao && (
            <p className="text-muted-foreground line-clamp-2 text-sm">
              {aula.descricao}
            </p>
          )}

          {/* Metadados */}
          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              {new Date(aula.data_aula).toLocaleDateString('pt-BR')}
            </span>
            <span className="inline-flex items-center gap-1">
              <Clock className="w-4 h-4" />
              {aula.horario_inicio} – {aula.horario_fim}
            </span>
            {turmaCode && (
              <span className="inline-flex items-center gap-1">
                <Users className="w-4 h-4" />
                {turmaCode === "Visitante" ? "Visitantes" : turmaCode}
              </span>
            )}
          </div>

          {/* Status de Presença */}
          {(jaRegistrouEntrada || jaRegistrouSaida) && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <div className="text-sm text-green-800">
                <p className="font-medium">Status da Presença:</p>
                <PresenciaStatus entrada={timestampEntrada} saida={timestampSaida} />
              </div>
            </div>
          )}

          {/* Ações */}
          <div className="mt-1 flex flex-col gap-2">
            {/* Botão principal - Entrar na aula */}
            <Button 
              onClick={() => window.open(aula.link_meet, '_blank')}
              className="w-full font-medium"
              variant={isEmTransmissao ? 'default' : 'outline'}
            >
              <Video className="w-4 h-4 mr-2" />
              {isEmTransmissao ? '🔴 ENTRAR NA AULA AO VIVO' : '🎥 Entre na sala e aguarde o professor'}
            </Button>

            {/* Botões de presença */}
            <div className="grid md:grid-cols-2 gap-2">
              <Dialog open={dialogAberto === 'entrada'} onOpenChange={(open) => !open && setDialogAberto(null)}>
                <DialogTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => abrirDialog('entrada')}
                    disabled={jaRegistrouEntrada}
                    className={jaRegistrouEntrada ? 'bg-green-50 text-green-700' : ''}
                  >
                    <User className="w-4 h-4 mr-2" />
                    {jaRegistrouEntrada ? 'Entrada OK' : 'Registrar Entrada'}
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Confirmar Entrada</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      Deseja registrar sua entrada na aula "{aula.titulo}"?
                    </p>
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
                      size="sm"
                      onClick={() => abrirDialog('saida')}
                      disabled={jaRegistrouSaida}
                      className={jaRegistrouSaida ? 'bg-green-50 text-green-700' : ''}
                    >
                      <User className="w-4 h-4 mr-2" />
                      {jaRegistrouSaida ? 'Saída OK' : 'Registrar Saída'}
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Confirmar Saída</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <p className="text-sm text-muted-foreground">
                        Deseja registrar sua saída da aula "{aula.titulo}"?
                      </p>
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
        </div>
      </div>
    </Card>
  );
};
