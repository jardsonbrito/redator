import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock, ExternalLink, FileText, Calendar, CheckCircle, Hourglass, RotateCcw, User } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { pickCoverImage, getExerciseAvailability, formatExercisePeriod } from "@/utils/exerciseUtils";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useExerciseSubmission } from "@/hooks/useExerciseSubmission";

interface ExerciseCardProps {
  exercise: {
    id: string;
    titulo: string;
    tipo: string;
    link_forms?: string;
    cover_url?: string;
    cover_upload_url?: string;
    cover_upload_path?: string;
    imagem_capa_url?: string;
    turmas_autorizadas?: string[] | null;
    permite_visitante?: boolean;
    ativo?: boolean;
    data_inicio?: string;
    hora_inicio?: string;
    data_fim?: string;
    hora_fim?: string;
    updated_at?: string;
    temas?: {
      frase_tematica: string;
      eixo_tematico: string;
      cover_url?: string;
      cover_file_path?: string;
    };
  };
  onAction?: (exercise: any) => void;
  actionLabel?: string;
  showActions?: boolean;
  isAdmin?: boolean;
  onEdit?: (exercise: any) => void;
  onDelete?: (id: string) => void;
  onToggleStatus?: (id: string, ativo: boolean) => void;
}

export function ExerciseCard({
  exercise,
  onAction,
  actionLabel = "Abrir Exercício",
  showActions = true,
  isAdmin = false,
  onEdit,
  onDelete,
  onToggleStatus
}: ExerciseCardProps) {
  const navigate = useNavigate();
  // Hook para verificar se o aluno já participou do exercício
  const { data: submissionData } = useExerciseSubmission(exercise.id);
  const submissionDetails = submissionData?.submissionDetails;
  const isProducaoGuiada = exercise.tipo === 'Produção Guiada';

  // Implementar sistema de múltiplas fontes de imagem com fallback automático
  const imageSources = pickCoverImage({
    cover_url: exercise?.cover_url,
    cover_upload_url: exercise?.cover_upload_url,
    cover_upload_path: exercise?.cover_upload_path,
    imagem_capa_url: exercise?.imagem_capa_url,
    updated_at: exercise?.updated_at,
    temas: exercise?.temas,
    tipo: exercise?.tipo
  });
  
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const availability = getExerciseAvailability(exercise);
  const periodText = formatExercisePeriod(
    exercise.data_inicio,
    exercise.hora_inicio, 
    exercise.data_fim,
    exercise.hora_fim
  );

  const getStatusBadge = () => {
    // Para administradores, manter comportamento original
    if (isAdmin) {
      if (!exercise.ativo) {
        return <Badge className="bg-gray-100 text-gray-700 text-xs font-medium">Inativo</Badge>;
      }

      switch (availability.status) {
        case 'agendado':
          return <Badge className="bg-orange-100 text-orange-700 text-xs font-medium">Indisponível</Badge>;
        case 'disponivel':
          return <Badge className="bg-green-100 text-green-700 text-xs font-medium">Disponível</Badge>;
        case 'encerrado':
          return <Badge className="bg-red-100 text-red-700 text-xs font-medium">Indisponível</Badge>;
        default:
          return null;
      }
    }

    // Para alunos: não mostrar badges
    return null;
  };

  const isDisabled = !exercise.ativo || availability.status === 'encerrado' || availability.status === 'agendado';

  const handleImageError = () => {
    const nextIndex = currentImageIndex + 1;
    if (nextIndex < imageSources.length) {
      setCurrentImageIndex(nextIndex);
    }
  };


  return (
    <Card className="overflow-hidden shadow-md rounded-2xl border border-gray-200 bg-white" role="listitem">
      {/* Capa - Always on top with 16:9 ratio */}
      <div className="aspect-[16/9] overflow-hidden bg-gradient-to-br from-purple-100 to-purple-200">
        <img
          src={imageSources && imageSources[currentImageIndex] ? imageSources[currentImageIndex] : '/placeholders/aula-cover.png'}
          alt={`Capa do exercício: ${exercise.titulo}`}
          className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
          onError={handleImageError}
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
                {exercise.titulo}
              </h2>
              {isAdmin && (
                <p className="text-sm text-gray-500">
                  {exercise.tipo}
                </p>
              )}
            </div>
            {getStatusBadge()}
          </div>

          {/* Informações extras */}
          <div className="text-sm text-gray-600 space-y-1">
            {availability.status === 'disponivel' && (
              <p className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Disponível até: {exercise.data_fim && exercise.hora_fim ?
                  new Date(`${exercise.data_fim}T${exercise.hora_fim}`).toLocaleDateString('pt-BR', {
                    day: '2-digit',
                    month: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit'
                  }).replace(',', ',') : 'Sem prazo definido'}
              </p>
            )}
            {availability.status === 'encerrado' && (
              <p className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Encerrado em: {exercise.data_fim && exercise.hora_fim ?
                  new Date(`${exercise.data_fim}T${exercise.hora_fim}`).toLocaleDateString('pt-BR', {
                    day: '2-digit',
                    month: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit'
                  }).replace(',', ',') : 'Data não disponível'}
              </p>
            )}
          </div>

          {/* Admin actions para desktop */}
          {isAdmin && showActions && (
            <div className="hidden lg:flex items-center gap-2">
              {onEdit && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={() => onEdit(exercise)}
                  title="Editar"
                >
                  <ExternalLink className="w-4 h-4" />
                </Button>
              )}
              {exercise.link_forms && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={() => window.open(exercise.link_forms, '_blank')}
                  title="Abrir Formulário"
                >
                  <FileText className="w-4 h-4" />
                </Button>
              )}
              {onToggleStatus && (
                <Button
                  variant="outline"
                  size="sm"
                  className="px-3 py-1 text-xs"
                  onClick={() => onToggleStatus(exercise.id, exercise.ativo || false)}
                >
                  {exercise.ativo ? 'Desativar' : 'Ativar'}
                </Button>
              )}
              {onDelete && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                  onClick={() => onDelete(exercise.id)}
                  title="Excluir"
                >
                  ×
                </Button>
              )}
            </div>
          )}

          {/* Ação */}
          {showActions && (
            <div className="pt-2">
              {isAdmin ? (
                /* Mobile Admin Actions */
                <div className="flex lg:hidden flex-wrap gap-2">
                  {onEdit && (
                    <Button variant="outline" size="sm" onClick={() => onEdit(exercise)}>
                      <ExternalLink className="w-3 h-3 mr-1" />
                      Editar
                    </Button>
                  )}
                  {exercise.link_forms && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(exercise.link_forms, '_blank')}
                    >
                      <FileText className="w-3 h-3 mr-1" />
                      Ver Forms
                    </Button>
                  )}
                  {onToggleStatus && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onToggleStatus(exercise.id, exercise.ativo || false)}
                    >
                      {exercise.ativo ? 'Desativar' : 'Ativar'}
                    </Button>
                  )}
                  {onDelete && (
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => onDelete(exercise.id)}
                    >
                      Excluir
                    </Button>
                  )}
                </div>
              ) : (
                /* Student Actions - seguindo padrão dos simulados */
                <>
                  {/* Antes do período (agendado) */}
                  {availability.status === 'agendado' && (
                    <Button
                      className="w-full bg-gray-400 text-white font-semibold"
                      disabled
                    >
                      Iniciar
                    </Button>
                  )}

                  {/* Durante o período - disponível */}
                  {availability.status === 'disponivel' && !submissionData?.hasSubmitted && (
                    <Button
                      className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold"
                      onClick={() => onAction && onAction(exercise)}
                    >
                      Iniciar
                    </Button>
                  )}

                  {/* Produção Guiada - já enviou (disponível ou encerrada) */}
                  {isProducaoGuiada && submissionData?.hasSubmitted && availability.status !== 'agendado' && (
                    <div className="space-y-2">
                      {submissionDetails?.corrigida ? (
                        <div className="space-y-3">
                          {/* Datas */}
                          <div className="space-y-1.5">
                            {submissionDetails.data_envio && (
                              <div className="flex items-center gap-2 text-xs text-gray-600">
                                <Calendar className="w-3.5 h-3.5 shrink-0" />
                                <span>
                                  <span className="font-medium">Enviado:</span>{" "}
                                  {format(new Date(submissionDetails.data_envio), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                                </span>
                              </div>
                            )}
                            {submissionDetails.data_correcao && (
                              <div className="flex items-center gap-2 text-xs text-gray-600">
                                <CheckCircle className="w-3.5 h-3.5 shrink-0 text-green-600" />
                                <span>
                                  <span className="font-medium">Corrigido:</span>{" "}
                                  {format(new Date(submissionDetails.data_correcao), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                                </span>
                              </div>
                            )}
                          </div>

                          {/* Nota em destaque */}
                          {submissionDetails.nota_total !== null && submissionDetails.nota_total !== undefined && (
                            <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-center">
                              <p className="text-xs font-medium text-green-700 mb-0.5">Sua nota</p>
                              <p className="text-2xl font-bold text-green-800 leading-none">
                                {submissionDetails.nota_total}
                                <span className="text-sm font-normal text-green-600 ml-1">/ 1000</span>
                              </p>
                            </div>
                          )}

                          {/* Badge + botão */}
                          <Badge className="bg-green-600 text-white text-xs px-2 py-1 flex items-center gap-1 w-fit">
                            <CheckCircle className="w-3 h-3" />
                            Corrigida
                          </Badge>
                          <Button
                            className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold"
                            onClick={() => navigate(`/exercicios/${exercise.id}/producao-guiada`)}
                          >
                            Ver minha atividade
                          </Button>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {submissionDetails?.status_corretor_1 === 'devolvida' ? (
                            <div className="flex items-center gap-1.5 text-sm text-red-600 font-medium">
                              <RotateCcw className="w-4 h-4" />
                              Devolvida — ajustes necessários
                            </div>
                          ) : (
                            <div className="flex items-center gap-1.5 text-sm text-amber-600">
                              <Hourglass className="w-4 h-4" />
                              Aguardando correção
                            </div>
                          )}
                          <Button
                            className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold"
                            onClick={() => navigate(`/exercicios/${exercise.id}/producao-guiada`)}
                          >
                            Ver minha atividade
                          </Button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Outros tipos - durante o período - já enviou */}
                  {!isProducaoGuiada && availability.status === 'disponivel' && submissionData?.hasSubmitted && (
                    <Button
                      className="w-full bg-blue-600 text-white font-semibold"
                      disabled
                    >
                      {exercise.tipo === 'Redação com Frase Temática' ? 'Redação enviada' : 'Concluído'}
                    </Button>
                  )}

                  {/* Outros tipos - após o período - com envio */}
                  {!isProducaoGuiada && availability.status === 'encerrado' && submissionData?.hasSubmitted && (
                    <Button
                      className="w-full bg-blue-600 text-white font-semibold"
                      disabled
                    >
                      {exercise.tipo === 'Redação com Frase Temática' ? 'Redação enviada' : 'Concluído'}
                    </Button>
                  )}

                  {/* Após o período - sem envio */}
                  {availability.status === 'encerrado' && !submissionData?.hasSubmitted && (
                    <div className="text-center text-sm text-gray-500 py-2">
                      Você não participou desta atividade
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}