import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useStudentAuth } from "@/hooks/useStudentAuth";
import { StatusBadge } from "./StatusBadge";
import { 
  Video, 
  Calendar, 
  Clock, 
  ExternalLink, 
  LogIn,
  Loader2
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

interface AulaAoVivoCardRefatoradoProps {
  aula: AulaAoVivo;
  status: 'agendada' | 'ao_vivo' | 'encerrada';
  attendanceStatus: 'presente' | 'ausente';
  turmaCode?: string;
  onEntrada: (aulaId: string) => Promise<void>;
  loadingOperation?: boolean;
}

export const AulaAoVivoCardRefatorado = ({
  aula,
  status,
  attendanceStatus,
  turmaCode,
  onEntrada,
  loadingOperation
}: AulaAoVivoCardRefatoradoProps) => {
  const { toast } = useToast();
  const { studentData } = useStudentAuth();

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

  const abrirAula = () => {
    window.open(aula.link_meet, '_blank');
  };

  const handleRegistrarEntrada = async () => {
    if (!studentData.email) {
      toast({
        title: "Erro", 
        description: "Dados do estudante não encontrados. Faça login novamente.",
        variant: "destructive"
      });
      return;
    }

    if (loadingOperation) {
      return;
    }

    try {
      await onEntrada(aula.id);
    } catch (error) {
      console.error('Erro ao registrar entrada:', error);
      toast({
        title: "Erro",
        description: "Erro ao registrar entrada. Tente novamente.",
        variant: "destructive"
      });
    }
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
            <StatusBadge status={attendanceStatus} />
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
          </div>

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

            {/* Botão de registrar entrada - apenas quando ausente e aula não encerrada */}
            {attendanceStatus === 'ausente' && status !== 'encerrada' && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleRegistrarEntrada}
                disabled={loadingOperation}
                className="w-full"
              >
                {loadingOperation ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <LogIn className="w-4 h-4 mr-2" />
                )}
                {loadingOperation ? 'Registrando...' : 'Registrar Entrada'}
              </Button>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
};