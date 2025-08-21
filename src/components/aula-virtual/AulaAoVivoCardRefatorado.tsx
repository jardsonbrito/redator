import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useStudentAuth } from "@/hooks/useStudentAuth";
import { 
  Video, 
  Calendar, 
  Clock, 
  Users, 
  ExternalLink, 
  LogIn, 
  LogOut 
} from "lucide-react";

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

interface AulaAoVivoCardRefatoradoProps {
  aula: AulaAoVivo;
  status: 'agendada' | 'ao_vivo' | 'encerrada';
  registro?: RegistroPresenca;
  turmaCode?: string;
  onEntrada: (aulaId: string) => Promise<void>;
  onSaida: (aulaId: string) => Promise<void>;
}

export const AulaAoVivoCardRefatorado = ({
  aula,
  status,
  registro,
  turmaCode,
  onEntrada,
  onSaida
}: AulaAoVivoCardRefatoradoProps) => {
  const [dialogAberto, setDialogAberto] = useState<'entrada' | 'saida' | null>(null);
  const { toast } = useToast();
  const { studentData } = useStudentAuth();

  const entradaRegistrada = !!registro?.entrada_at;
  const saidaRegistrada = !!registro?.saida_at;

  const getStatusBadge = () => {
    switch (status) {
      case 'ao_vivo':
        return <Badge variant="destructive" className="bg-red-600 text-white animate-pulse">🔴 AO VIVO</Badge>;
      case 'agendada':
        return <Badge variant="default" className="bg-blue-600 text-white">📅 Agendada</Badge>;
      case 'encerrada':
        return <Badge variant="secondary" className="bg-gray-500 text-white">⏹️ Encerrada</Badge>;
      default:
        return null;
    }
  };

  const formatTimestamp = (timestamp?: string | null) => {
    if (!timestamp) return '—';
    return new Date(timestamp).toLocaleTimeString('pt-BR');
  };

  const abrirAula = () => {
    window.open(aula.link_meet, '_blank');
  };

  const confirmarPresenca = async (tipo: 'entrada' | 'saida') => {
    try {
      console.log(`Iniciando registro de ${tipo} para aula ${aula.id}`);
      
      if (tipo === 'entrada') {
        await onEntrada(aula.id);
      } else {
        await onSaida(aula.id);
      }
      
      console.log(`Registro de ${tipo} concluído com sucesso`);
    } catch (error) {
      console.error(`Erro ao registrar ${tipo}:`, error);
      toast({
        title: "Erro",
        description: `Erro ao registrar ${tipo}. Tente novamente.`,
        variant: "destructive"
      });
    } finally {
      setDialogAberto(null);
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
    setDialogAberto(tipo);
  };

  return (
    <Card className="rounded-2xl shadow-sm border bg-card p-4 md:p-5 hover:shadow-md transition-shadow duration-300">
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
          {status === 'ao_vivo' && (
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
            {getStatusBadge()}
            <Badge variant="outline" className="text-xs">Google Meet</Badge>
            {turmaCode && turmaCode !== "Visitante" && (
              <Badge variant="outline" className="text-xs">{turmaCode}</Badge>
            )}
          </div>

          {/* Título */}
          <h3 className="text-lg md:text-xl font-semibold leading-tight text-foreground">
            {aula.titulo}
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
              {new Date(aula.data_aula + 'T00:00:00').toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })}
            </span>
            <span className="inline-flex items-center gap-1">
              <Clock className="w-4 h-4" />
              {aula.horario_inicio} – {aula.horario_fim}
            </span>
            {turmaCode === "Visitante" && (
              <span className="inline-flex items-center gap-1">
                <Users className="w-4 h-4" />
                Visitantes
              </span>
            )}
          </div>

          {/* Status de Presença */}
          {(entradaRegistrada || saidaRegistrada) && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <div className="text-sm text-green-800">
                <p className="font-medium">Status da Presença:</p>
                <div className="mt-1 space-y-1">
                  {entradaRegistrada && (
                    <p>✅ Entrada registrada às {formatTimestamp(registro?.entrada_at)}</p>
                  )}
                  {saidaRegistrada && (
                    <p>✅ Saída registrada às {formatTimestamp(registro?.saida_at)}</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Ações */}
          <div className="mt-1 flex flex-col gap-2">
            {/* Botão principal - Entrar na aula */}
            <Button 
              onClick={abrirAula}
              className="w-full font-medium"
              variant={status === 'ao_vivo' ? 'default' : 'outline'}
              disabled={status === 'encerrada'}
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              {status === 'ao_vivo' ? '🔴 Entrar na Aula Ao Vivo' : 
               status === 'agendada' ? 'Aguardar na Sala' : 'Aula Encerrada'}
            </Button>

            {/* Botões de presença - mostrar ambos quando aula está AO VIVO */}
            {status === 'ao_vivo' && (
              <div className="grid md:grid-cols-2 gap-2">
                {/* Botão Registrar Entrada */}
                <Dialog open={dialogAberto === 'entrada'} onOpenChange={(open) => !open && setDialogAberto(null)}>
                  <DialogTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => abrirDialog('entrada')}
                      disabled={entradaRegistrada}
                      className={entradaRegistrada ? 'bg-green-50 text-green-700' : ''}
                    >
                      <LogIn className="w-4 h-4 mr-2" />
                      {entradaRegistrada ? 'Entrada Registrada' : 'Registrar Entrada'}
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
                        onClick={() => confirmarPresenca('entrada')}
                        className="w-full"
                      >
                        Confirmar Entrada
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>

                {/* Botão Registrar Saída - sempre visível, mas desabilitado conforme regras */}
                <Dialog open={dialogAberto === 'saida'} onOpenChange={(open) => !open && setDialogAberto(null)}>
                  <DialogTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => abrirDialog('saida')}
                      disabled={!entradaRegistrada || saidaRegistrada}
                      className={saidaRegistrada ? 'bg-green-50 text-green-700' : ''}
                    >
                      <LogOut className="w-4 h-4 mr-2" />
                      {saidaRegistrada ? 'Saída Registrada' : 'Registrar Saída'}
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
                        onClick={() => confirmarPresenca('saida')}
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
        </div>
      </div>
    </Card>
  );
};