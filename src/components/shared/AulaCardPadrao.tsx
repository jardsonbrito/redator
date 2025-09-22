import React from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Clock, Users, MoreHorizontal, Video, ExternalLink, LogIn, BarChart3, Edit, Power, PowerOff, Trash2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { computeStatus } from '@/utils/aulaStatus';

interface AulaCardData {
  id: string;
  titulo: string;
  descricao?: string;
  data_aula: string;
  horario_inicio: string;
  horario_fim: string;
  turmas_autorizadas: string[];
  permite_visitante?: boolean;
  imagem_capa_url?: string;
  link_meet?: string;
  ativo: boolean;
  eh_aula_ao_vivo?: boolean;
  status_transmissao?: string;
}

interface AulaCardActions {
  onEntrarAula?: (id: string) => void;
  onRegistrarEntrada?: (id: string) => void;
  onFrequencia?: (id: string) => void;
  onEditar?: (id: string) => void;
  onDesativar?: (id: string) => void;
  onExcluir?: (id: string) => void;
}

interface AulaCardPadraoProps {
  aula: AulaCardData;
  perfil: 'aluno' | 'admin';
  actions?: AulaCardActions;
  attendanceStatus?: 'presente' | 'ausente';
  loadingOperation?: boolean;
}

export const AulaCardPadrao = ({ aula, perfil, actions, attendanceStatus = 'ausente', loadingOperation }: AulaCardPadraoProps) => {
  const getStatusAula = () => {
    if (!aula.eh_aula_ao_vivo) return 'encerrada';

    try {
      if (!aula.data_aula || !aula.horario_inicio || !aula.horario_fim) {
        return 'encerrada';
      }

      const status = computeStatus({
        data_aula: aula.data_aula,
        horario_inicio: aula.horario_inicio,
        horario_fim: aula.horario_fim
      });

      return status;
    } catch (error) {
      console.error('Erro ao calcular status da aula:', error);
      return 'encerrada';
    }
  };

  const status = getStatusAula();

  const getStatusBadge = () => {
    if (!aula.eh_aula_ao_vivo) {
      return <Badge className="bg-gray-100 text-gray-700 text-xs font-medium">Gravada</Badge>;
    }

    switch (status) {
      case 'agendada':
        return <Badge className="bg-blue-100 text-blue-700 text-xs font-medium">Agendada</Badge>;
      case 'ao_vivo':
        return <Badge className="bg-red-100 text-red-700 text-xs font-medium animate-pulse">Ao Vivo</Badge>;
      case 'encerrada':
        return <Badge className="bg-gray-100 text-gray-700 text-xs font-medium">Encerrada</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-700 text-xs font-medium">Indefinida</Badge>;
    }
  };

  const getAttendanceBadge = () => {
    if (perfil !== 'aluno' || !aula.eh_aula_ao_vivo) return null;

    return (
      <Badge variant={attendanceStatus === 'presente' ? 'default' : 'secondary'} className="text-xs">
        {attendanceStatus === 'presente' ? 'Presente' : 'Ausente'}
      </Badge>
    );
  };

  const formatDateTime = () => {
    try {
      const date = new Date(aula.data_aula + 'T00:00:00');
      const dateStr = format(date, 'dd/MM/yyyy', { locale: ptBR });
      return `${dateStr} • ${aula.horario_inicio} - ${aula.horario_fim}`;
    } catch {
      return 'Data não disponível';
    }
  };

  const getCoverImage = () => {
    return aula.imagem_capa_url || "/placeholders/aula-cover.png";
  };

  const isAulaDisponivel = () => {
    if (!aula.ativo) return false;
    return true; // Para aulas, sempre permitir acesso se estiver ativa
  };

  const getButtonText = () => {
    if (!aula.eh_aula_ao_vivo) return 'Assistir Aula';

    switch (status) {
      case 'agendada':
        return 'Aguardar na Sala';
      case 'ao_vivo':
        return 'Entrar na Aula Ao Vivo';
      case 'encerrada':
        return 'Aula Encerrada';
      default:
        return 'Indisponível';
    }
  };

  return (
    <Card className="overflow-hidden shadow-md rounded-2xl border border-gray-200 bg-white">
      {/* Capa - Always on top with 16:9 ratio */}
      <div className="aspect-[16/9] overflow-hidden bg-gradient-to-br from-purple-100 to-purple-200">
        <img
          src={getCoverImage()}
          alt={`Capa da aula: ${aula.titulo}`}
          className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
          onError={(e) => {
            e.currentTarget.src = "/placeholders/aula-cover.png";
          }}
          loading="lazy"
        />
      </div>

      {/* Content */}
      <div className="p-6">
        <div className="space-y-4">
          {/* Cabeçalho */}
          <div className="flex justify-between items-start gap-3">
            <div className="flex-1">
              <h2 className="text-lg font-semibold text-gray-900 leading-tight mb-1">
                {aula.titulo}
              </h2>
              {aula.descricao && (
                <p className="text-sm text-gray-600 line-clamp-2">
                  {aula.descricao}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2">
              {getStatusBadge()}
              {getAttendanceBadge()}
              {perfil === 'admin' && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {aula.eh_aula_ao_vivo && (
                      <DropdownMenuItem onClick={() => actions?.onFrequencia?.(aula.id)}>
                        <BarChart3 className="mr-2 h-4 w-4" />
                        Frequência
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem onClick={() => actions?.onEditar?.(aula.id)}>
                      <Edit className="mr-2 h-4 w-4" />
                      Editar
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => actions?.onDesativar?.(aula.id)}>
                      {aula.ativo ? (
                        <>
                          <PowerOff className="mr-2 h-4 w-4" />
                          Desativar
                        </>
                      ) : (
                        <>
                          <Power className="mr-2 h-4 w-4" />
                          Ativar
                        </>
                      )}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => actions?.onExcluir?.(aula.id)} className="text-red-600">
                      <Trash2 className="mr-2 h-4 w-4" />
                      Excluir
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </div>

          {/* Informações de data e horário */}
          <div className="text-sm text-gray-600">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              <span>{formatDateTime()}</span>
            </div>
          </div>

          {/* Turmas autorizadas */}
          {aula.turmas_autorizadas && aula.turmas_autorizadas.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Users className="w-4 h-4 text-gray-500" />
                <span className="text-sm font-medium text-gray-700">Turmas:</span>
              </div>
              <div className="flex flex-wrap gap-1">
                {aula.turmas_autorizadas.slice(0, 3).map((turma, index) => (
                  <Badge key={index} variant="secondary" className="text-xs bg-purple-100 text-purple-700">
                    {turma}
                  </Badge>
                ))}
                {aula.turmas_autorizadas.length > 3 && (
                  <Badge variant="secondary" className="text-xs bg-purple-100 text-purple-700">
                    +{aula.turmas_autorizadas.length - 3}
                  </Badge>
                )}
                {aula.permite_visitante && (
                  <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-700">
                    Visitantes
                  </Badge>
                )}
              </div>
            </div>
          )}

          {/* Ações */}
          <div className="pt-2">
            {perfil === 'aluno' && (
              <div className="space-y-2">
                <Button
                  className={`w-full font-semibold ${status === 'ao_vivo' ? 'bg-red-600 hover:bg-red-700 animate-pulse' : status === 'encerrada' ? 'bg-gray-400' : 'bg-green-600 hover:bg-green-700'} text-white`}
                  onClick={() => actions?.onEntrarAula?.(aula.id)}
                  disabled={!isAulaDisponivel() || status === 'encerrada'}
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  {getButtonText()}
                </Button>

                {/* Botão de registrar entrada - apenas para aulas ao vivo e quando ausente */}
                {aula.eh_aula_ao_vivo && attendanceStatus === 'ausente' && status !== 'encerrada' && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => actions?.onRegistrarEntrada?.(aula.id)}
                    disabled={loadingOperation}
                    className="w-full"
                  >
                    {loadingOperation ? (
                      <>
                        <div className="w-4 h-4 mr-2 animate-spin rounded-full border-2 border-gray-300 border-t-gray-600" />
                        Registrando...
                      </>
                    ) : (
                      <>
                        <LogIn className="w-4 h-4 mr-2" />
                        Registrar Entrada
                      </>
                    )}
                  </Button>
                )}
              </div>
            )}

            {perfil === 'admin' && (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => actions?.onEntrarAula?.(aula.id)}
                >
                  Ver Aula
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
};