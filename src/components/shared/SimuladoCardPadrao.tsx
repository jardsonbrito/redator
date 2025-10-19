import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, Clock, Edit, Eye, EyeOff, Trash2, AlertTriangle, MoreVertical, X } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { computeSimuladoStatus } from '@/utils/simuladoStatus';
import { resolveSimuladoCover } from '@/utils/coverUtils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useCancelRedacao } from '@/hooks/useCancelRedacao';
import { useStudentAuth } from '@/hooks/useStudentAuth';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import duration from 'dayjs/plugin/duration';

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(duration);

const TZ = 'America/Fortaleza';

export interface SimuladoCardData {
  id: string;
  titulo: string;
  data_inicio: string;
  hora_inicio: string;
  data_fim: string;
  hora_fim: string;
  ativo?: boolean;
  turmas_autorizadas?: string[];
  permite_visitante?: boolean;
  tema?: {
    id: string;
    frase_tematica: string;
    eixo_tematico: string;
    cover_file_path?: string;
    cover_url?: string;
  } | null;
  // Para controle de envio do aluno
  hasSubmitted?: boolean;
  submissionStatus?: 'ENVIADO' | 'AUSENTE';
  // Nota média do aluno no simulado
  notaMedia?: number | null;
  // Dados da redação enviada (para cancelamento)
  redacaoId?: string;
  redacaoData?: {
    id: string;
    email_aluno: string;
    corrigida: boolean;
    nota_total: number | null;
    status: string;
    tipo_envio: string;
  };
}

interface SimuladoCardActions {
  onEditar?: (id: string) => void;
  onToggleStatus?: (id: string, currentStatus: string) => void;
  onExcluir?: (id: string) => void;
  onVerSimulado?: (id: string) => void;
  onVerDetalhes?: (id: string) => void;
}

interface SimuladoCardProps {
  simulado: SimuladoCardData;
  perfil: 'admin' | 'aluno' | 'corretor';
  actions: SimuladoCardActions;
  className?: string;
}

// Componente Timer para simulados agendados
const CountdownTimer = ({ targetDate }: { targetDate: string }) => {
  const [timeLeft, setTimeLeft] = useState<{ days: number; hours: number; minutes: number } | null>(null);

  useEffect(() => {
    const updateCountdown = () => {
      const now = dayjs.tz(dayjs(), TZ);
      const target = dayjs.tz(targetDate, 'YYYY-MM-DD HH:mm', TZ);

      const diff = target.diff(now);

      if (diff <= 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0 });
        return;
      }

      const durationObj = dayjs.duration(diff);
      setTimeLeft({
        days: durationObj.days(),
        hours: durationObj.hours(),
        minutes: durationObj.minutes()
      });
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 30000); // Atualiza a cada 30 segundos

    return () => clearInterval(interval);
  }, [targetDate]);

  if (!timeLeft) return null;

  return (
    <div className="w-full h-40 flex items-center justify-center bg-gradient-to-br from-purple-600 via-purple-700 to-blue-600 rounded-lg text-white shadow-lg">
      <div className="text-center px-4">
        <p className="text-sm font-medium mb-4 opacity-90 tracking-wide">Faltam para o início:</p>
        <div className="flex items-center justify-center gap-3 sm:gap-4">
          <div className="text-center bg-white/10 rounded-xl px-3 py-2 backdrop-blur-sm">
            <div className="text-xl sm:text-2xl md:text-3xl font-bold tabular-nums leading-none">
              {timeLeft.days}
            </div>
            <div className="text-xs opacity-80 mt-1 font-medium">dias</div>
          </div>
          <div className="text-center bg-white/10 rounded-xl px-3 py-2 backdrop-blur-sm">
            <div className="text-xl sm:text-2xl md:text-3xl font-bold tabular-nums leading-none">
              {timeLeft.hours}
            </div>
            <div className="text-xs opacity-80 mt-1 font-medium">horas</div>
          </div>
          <div className="text-center bg-white/10 rounded-xl px-3 py-2 backdrop-blur-sm">
            <div className="text-xl sm:text-2xl md:text-3xl font-bold tabular-nums leading-none">
              {timeLeft.minutes}
            </div>
            <div className="text-xs opacity-80 mt-1 font-medium">min</div>
          </div>
        </div>
      </div>
    </div>
  );
};

const getStatusInfo = (simulado: SimuladoCardData) => {
  const status = computeSimuladoStatus(simulado);

  switch (status) {
    case 'agendado':
      return { label: 'Agendado', bgColor: 'bg-yellow-500' };
    case 'ativo':
      return { label: 'Em andamento', bgColor: 'bg-green-600' };
    case 'encerrado':
      if (simulado.submissionStatus === 'ENVIADO') {
        return { label: 'Presente', bgColor: 'bg-blue-600' };
      } else if (simulado.submissionStatus === 'AUSENTE') {
        return { label: 'Ausente', bgColor: 'bg-red-600' };
      }
      return { label: 'Finalizado', bgColor: 'bg-gray-600' };
    default:
      return { label: 'Inativo', bgColor: 'bg-gray-400' };
  }
};

const getFormattedDates = (simulado: SimuladoCardData) => {
  try {
    const dataInicio = new Date(`${simulado.data_inicio}T${simulado.hora_inicio}`);
    const dataFim = new Date(`${simulado.data_fim}T${simulado.hora_fim}`);

    return {
      inicio: format(dataInicio, "dd/MM/yyyy 'às' HH'h'", { locale: ptBR }),
      fim: format(dataFim, "dd/MM/yyyy 'às' HH'h'", { locale: ptBR })
    };
  } catch {
    return { inicio: 'Data inválida', fim: 'Data inválida' };
  }
};

export const SimuladoCardPadrao = ({ simulado, perfil, actions, className = '' }: SimuladoCardProps) => {
  const status = computeSimuladoStatus(simulado);
  const statusInfo = getStatusInfo(simulado);
  const dates = getFormattedDates(simulado);
  const isAgendado = status === 'agendado';
  const isAtivo = status === 'ativo';
  const isEncerrado = status === 'encerrado';

  // Hook para cancelamento (apenas para alunos)
  const { studentData } = useStudentAuth();
  const { cancelRedacaoSimulado, canCancelRedacao, getCreditosACancelar, loading: cancelLoading } = useCancelRedacao({
    onSuccess: () => {
      // Recarregar a página ou atualizar estado
      window.location.reload();
    }
  });

  // Estado do dropdown
  const [dropdownOpen, setDropdownOpen] = useState(false);

  // Determinar se pode cancelar redação
  const podeCancelar = perfil === 'aluno' &&
                       simulado.hasSubmitted &&
                       simulado.redacaoData &&
                       canCancelRedacao(simulado.redacaoData);

  // Determinar se o card é clicável (remover clicabilidade para alunos que já enviaram redação)
  const isClickable = (perfil === 'aluno' && isAtivo) ||
                     (perfil === 'corretor' && isEncerrado);

  const handleCardClick = () => {
    if (!isClickable) return;

    if (perfil === 'aluno' && isAtivo) {
      actions.onVerSimulado?.(simulado.id);
    } else if (perfil === 'corretor' && isEncerrado) {
      actions.onVerDetalhes?.(simulado.id);
    }
  };

  const handleVerRedacao = () => {
    // Função específica para o botão "Ver Minha Redação"
    actions.onVerSimulado?.(simulado.id);
  };

  const handleExcluir = () => {
    if (actions.onExcluir) {
      actions.onExcluir(simulado.id);
    }
  };

  const handleCancelarRedacao = () => {
    if (simulado.redacaoData && studentData?.email) {
      cancelRedacaoSimulado(simulado.redacaoData.id, studentData.email);
    }
  };

  return (
    <Card className={`bg-white rounded-xl shadow-md overflow-hidden hover:shadow-lg transition-all duration-300 border-gray-200 flex flex-col h-full ${isClickable ? 'cursor-pointer' : ''} ${className}`}>
      {/* Imagem/Timer + badges */}
      <div className="relative" onClick={isClickable ? handleCardClick : undefined}>
        {isAgendado ? (
          // Timer para simulados agendados
          <CountdownTimer targetDate={`${simulado.data_inicio} ${simulado.hora_inicio}`} />
        ) : (
          // Imagem normal para outros status
          <div className="w-full h-40 overflow-hidden">
            <img
              src={resolveSimuladoCover(simulado) || '/lovable-uploads/66db3418-766f-47b9-836b-07a6a228a79c.png'}
              alt={`Capa do simulado: ${simulado.titulo}`}
              className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.src = '/lovable-uploads/66db3418-766f-47b9-836b-07a6a228a79c.png';
              }}
            />
          </div>
        )}

        {/* Badge do eixo temático - não mostrar quando agendado para alunos */}
        {simulado.tema?.eixo_tematico && !(isAgendado && perfil === 'aluno') && (
          <Badge className="absolute top-2 left-2 bg-green-500 hover:bg-green-600 text-white text-xs px-2 py-1 shadow-sm">
            {simulado.tema.eixo_tematico}
          </Badge>
        )}

        {/* Badge de status */}
        <Badge className={`absolute top-2 right-2 text-white text-xs px-2 py-1 shadow-sm ${statusInfo.bgColor}`}>
          {statusInfo.label}
        </Badge>
      </div>

      {/* Conteúdo */}
      <div className="p-4 flex-1 flex flex-col" onClick={isClickable ? handleCardClick : undefined}>
        <h3 className="text-base sm:text-lg font-semibold text-gray-900 line-clamp-2 mb-2 leading-tight">
          {simulado.titulo}
        </h3>

        {simulado.tema?.frase_tematica && !isAgendado && (
          <p className="text-sm text-gray-600 line-clamp-2 mb-2">
            {simulado.tema.frase_tematica}
          </p>
        )}

        {/* Meta info - datas */}
        <div className="text-xs text-gray-500 space-y-1 mb-4">
          <div className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            <span>Início: {dates.inicio}</span>
          </div>
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            <span>Fim: {dates.fim}</span>
          </div>
        </div>

        {/* Nota média para alunos que participaram */}
        {perfil === 'aluno' && isEncerrado && simulado.submissionStatus === 'ENVIADO' && simulado.notaMedia !== null && (
          <div className="mb-3">
            <div className="bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-lg p-3">
              <div className="text-center">
                <div className="text-xs text-purple-600 font-medium mb-1">Sua Nota</div>
                <div className="text-xl font-bold text-purple-700">
                  {simulado.notaMedia?.toFixed(1)}
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="flex-1"></div>
      </div>

      {/* Rodapé condicional */}
      {(perfil === 'admin' || !isAgendado) && (
        <div className="px-4 py-3 border-t border-gray-100 mt-auto">
          {perfil === 'admin' ? (
            <div className="flex items-center justify-between">
              {/* Turmas à esquerda */}
              <div className="text-xs text-gray-500 flex items-center gap-1">
                <span>👥</span>
                <span className="hidden sm:inline">
                  {simulado.turmas_autorizadas?.join(', ') || 'Sem turmas'}
                </span>
                <span className="sm:hidden">
                  {simulado.turmas_autorizadas?.length || 0} turma(s)
                </span>
              </div>

              {/* Menu de ações */}
              <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="p-2 h-8 w-8 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
                  >
                    <MoreVertical className="h-4 w-4 text-gray-600" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-44 shadow-lg border border-gray-200">
                  <DropdownMenuItem
                    onClick={() => {
                      setDropdownOpen(false);
                      actions.onEditar?.(simulado.id);
                    }}
                    className="flex items-center cursor-pointer hover:bg-gray-50 transition-colors"
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Editar
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => {
                      setDropdownOpen(false);
                      actions.onToggleStatus?.(simulado.id, simulado.ativo ? 'ativo' : 'inativo');
                    }}
                    className="flex items-center cursor-pointer hover:bg-gray-50 transition-colors"
                  >
                    {simulado.ativo ? (
                      <>
                        <EyeOff className="h-4 w-4 mr-2" />
                        Desativar
                      </>
                    ) : (
                      <>
                        <Eye className="h-4 w-4 mr-2" />
                        Ativar
                      </>
                    )}
                  </DropdownMenuItem>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <DropdownMenuItem
                        onSelect={(e) => {
                          e.preventDefault();
                          setDropdownOpen(false);
                        }}
                        className="flex items-center cursor-pointer text-red-600 hover:bg-red-50 focus:text-red-600 transition-colors"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Excluir
                      </DropdownMenuItem>
                    </AlertDialogTrigger>
                    <AlertDialogContent className="max-w-md mx-4 rounded-lg">
                      <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center gap-2">
                          <AlertTriangle className="h-5 w-5 text-red-500" />
                          Confirmar Exclusão
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                          Tem certeza que deseja excluir este simulado? Esta ação não pode ser desfeita.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter className="flex-col sm:flex-row gap-2">
                        <AlertDialogCancel className="w-full sm:w-auto">Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={handleExcluir}
                          className="w-full sm:w-auto bg-red-600 hover:bg-red-700 transition-colors"
                        >
                          Excluir
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ) : (
            // Botão para alunos e corretores (quando aplicável)
            <>
              {perfil === 'aluno' && isAtivo && !simulado.hasSubmitted && (
                <Button
                  onClick={handleCardClick}
                  className="w-full bg-purple-600 text-white py-2.5 px-4 rounded-lg text-sm font-medium hover:bg-purple-700 transition-all duration-200 shadow-sm hover:shadow-md"
                >
                  Participar do Simulado
                </Button>
              )}
              {perfil === 'aluno' && isAtivo && simulado.hasSubmitted && (
                <div className="space-y-2">
                  <Button
                    onClick={handleVerRedacao}
                    className="w-full bg-blue-600 text-white py-2.5 px-4 rounded-lg text-sm font-medium hover:bg-blue-700 transition-all duration-200 shadow-sm hover:shadow-md"
                  >
                    Ver Redação
                  </Button>
                  {podeCancelar && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="outline"
                          className="w-full text-red-600 border-red-200 hover:bg-red-50 py-2.5 px-4 rounded-lg text-sm font-medium transition-all duration-200"
                          disabled={cancelLoading}
                        >
                          <X className="w-4 h-4 mr-2" />
                          Cancelar Envio
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle className="flex items-center gap-2">
                            <AlertTriangle className="w-5 h-5 text-orange-500" />
                            Cancelar envio da redação
                          </AlertDialogTitle>
                          <AlertDialogDescription className="space-y-2">
                            <p>Tem certeza que deseja cancelar o envio desta redação de simulado?</p>
                            <p className="font-medium">
                              <strong>Simulado:</strong> {simulado.titulo}
                            </p>
                            {getCreditosACancelar('simulado') > 0 && (
                              <div className="bg-green-50 border border-green-200 rounded p-3 mt-3">
                                <p className="text-green-800 text-sm">
                                  ✅ <strong>{getCreditosACancelar('simulado')} crédito(s)</strong> serão devolvidos à sua conta.
                                </p>
                              </div>
                            )}
                            <p className="text-red-600 text-sm mt-3">
                              ⚠️ Esta ação não pode ser desfeita. A redação será removida permanentemente.
                            </p>
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Não, manter redação</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={handleCancelarRedacao}
                            className="bg-red-600 hover:bg-red-700"
                            disabled={cancelLoading}
                          >
                            {cancelLoading ? "Cancelando..." : "Sim, cancelar envio"}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                </div>
              )}
              {perfil === 'aluno' && isEncerrado && simulado.submissionStatus === 'ENVIADO' && simulado.notaMedia !== null && (
                <div className="space-y-2">
                  <Button
                    onClick={handleVerRedacao}
                    className="w-full bg-green-600 text-white py-2.5 px-4 rounded-lg text-sm font-medium hover:bg-green-700 transition-all duration-200 shadow-sm hover:shadow-md"
                  >
                    Ver Minha Redação
                  </Button>
                  {podeCancelar && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="outline"
                          className="w-full text-red-600 border-red-200 hover:bg-red-50 py-2.5 px-4 rounded-lg text-sm font-medium transition-all duration-200"
                          disabled={cancelLoading}
                        >
                          <X className="w-4 h-4 mr-2" />
                          Cancelar Envio
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle className="flex items-center gap-2">
                            <AlertTriangle className="w-5 h-5 text-orange-500" />
                            Cancelar envio da redação
                          </AlertDialogTitle>
                          <AlertDialogDescription className="space-y-2">
                            <p>Tem certeza que deseja cancelar o envio desta redação de simulado?</p>
                            <p className="font-medium">
                              <strong>Simulado:</strong> {simulado.titulo}
                            </p>
                            {getCreditosACancelar('simulado') > 0 && (
                              <div className="bg-green-50 border border-green-200 rounded p-3 mt-3">
                                <p className="text-green-800 text-sm">
                                  ✅ <strong>{getCreditosACancelar('simulado')} crédito(s)</strong> serão devolvidos à sua conta.
                                </p>
                              </div>
                            )}
                            <p className="text-red-600 text-sm mt-3">
                              ⚠️ Esta ação não pode ser desfeita. A redação será removida permanentemente.
                            </p>
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Não, manter redação</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={handleCancelarRedacao}
                            className="bg-red-600 hover:bg-red-700"
                            disabled={cancelLoading}
                          >
                            {cancelLoading ? "Cancelando..." : "Sim, cancelar envio"}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                </div>
              )}
              {perfil === 'aluno' && isEncerrado && simulado.submissionStatus === 'ENVIADO' && simulado.notaMedia === null && (
                <div className="space-y-2">
                  <Button
                    onClick={handleVerRedacao}
                    className="w-full bg-blue-600 text-white py-2.5 px-4 rounded-lg text-sm font-medium hover:bg-blue-700 transition-all duration-200 shadow-sm hover:shadow-md"
                  >
                    Ver Redação
                  </Button>
                  {podeCancelar && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="outline"
                          className="w-full text-red-600 border-red-200 hover:bg-red-50 py-2.5 px-4 rounded-lg text-sm font-medium transition-all duration-200"
                          disabled={cancelLoading}
                        >
                          <X className="w-4 h-4 mr-2" />
                          Cancelar Envio
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle className="flex items-center gap-2">
                            <AlertTriangle className="w-5 h-5 text-orange-500" />
                            Cancelar envio da redação
                          </AlertDialogTitle>
                          <AlertDialogDescription className="space-y-2">
                            <p>Tem certeza que deseja cancelar o envio desta redação de simulado?</p>
                            <p className="font-medium">
                              <strong>Simulado:</strong> {simulado.titulo}
                            </p>
                            {getCreditosACancelar('simulado') > 0 && (
                              <div className="bg-green-50 border border-green-200 rounded p-3 mt-3">
                                <p className="text-green-800 text-sm">
                                  ✅ <strong>{getCreditosACancelar('simulado')} crédito(s)</strong> serão devolvidos à sua conta.
                                </p>
                              </div>
                            )}
                            <p className="text-red-600 text-sm mt-3">
                              ⚠️ Esta ação não pode ser desfeita. A redação será removida permanentemente.
                            </p>
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Não, manter redação</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={handleCancelarRedacao}
                            className="bg-red-600 hover:bg-red-700"
                            disabled={cancelLoading}
                          >
                            {cancelLoading ? "Cancelando..." : "Sim, cancelar envio"}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                </div>
              )}
              {perfil === 'aluno' && isEncerrado && simulado.submissionStatus === 'AUSENTE' && (
                <div className="text-center text-sm text-gray-500 py-2">
                  Você não enviou sua redação para este simulado
                </div>
              )}
              {perfil === 'corretor' && isEncerrado && (
                <Button
                  onClick={handleCardClick}
                  className="w-full bg-purple-600 text-white py-2.5 px-4 rounded-lg text-sm font-medium hover:bg-purple-700 transition-all duration-200 shadow-sm hover:shadow-md"
                >
                  Ver Redações
                </Button>
              )}
            </>
          )}
        </div>
      )}
    </Card>
  );
};