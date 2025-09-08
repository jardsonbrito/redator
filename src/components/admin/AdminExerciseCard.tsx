import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Edit2, Trash2, Eye, Power, Clock, Calendar } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { getExerciseAvailability, formatExercisePeriod } from "@/utils/exerciseUtils";

interface Exercicio {
  id: string;
  titulo: string;
  tipo: string;
  link_forms?: string;
  tema_id?: string;
  imagem_capa_url?: string;
  cover_url?: string;
  cover_upload_url?: string;
  cover_upload_path?: string;
  updated_at?: string;
  turmas_autorizadas: string[] | null;
  permite_visitante: boolean;
  ativo: boolean;
  criado_em: string;
  data_inicio?: string;
  hora_inicio?: string;
  data_fim?: string;
  hora_fim?: string;
  temas?: {
    frase_tematica: string;
    eixo_tematico: string;
    cover_url?: string;
    cover_file_path?: string;
  };
}

interface AdminExerciseCardProps {
  exercicio: Exercicio;
  onEdit: (exercicio: Exercicio) => void;
  onToggleActive: (exercicio: Exercicio) => void;
  onDelete: (exercicio: Exercicio) => void;
}

export const AdminExerciseCard = ({
  exercicio,
  onEdit,
  onToggleActive,
  onDelete
}: AdminExerciseCardProps) => {
  const getCoverImage = () => {
    if (exercicio.cover_upload_url) return exercicio.cover_upload_url;
    if (exercicio.cover_url) return exercicio.cover_url;
    if (exercicio.imagem_capa_url) return exercicio.imagem_capa_url;
    if (exercicio.temas?.cover_url) return exercicio.temas.cover_url;
    return "/placeholders/aula-cover.png";
  };

  const formatCreationDate = (dateString: string) => {
    try {
      return format(new Date(dateString), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
    } catch {
      return dateString;
    }
  };

  const getKindBadge = () => {
    switch (exercicio.tipo) {
      case 'Google Forms':
        return { label: 'Google Forms', variant: 'secondary' as const };
      case 'Redação com Frase Temática':
        return { label: 'Redação com Frase Temática', variant: 'outline' as const };
      default:
        return { label: exercicio.tipo, variant: 'secondary' as const };
    }
  };

  const kindBadge = getKindBadge();

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-0">
        <div className="flex flex-col sm:flex-row">
          {/* Cover Image */}
          <div className="w-full sm:w-48 h-48 sm:h-auto bg-muted relative overflow-hidden flex-shrink-0">
            <img
              src={getCoverImage()}
              alt={exercicio.titulo}
              className="w-full h-full object-cover"
              onError={(e) => {
                e.currentTarget.src = "/placeholders/aula-cover.png";
              }}
            />
          </div>

          {/* Content */}
          <div className="flex-1 p-4 sm:p-6">
            <div className="space-y-4">
              {/* Header with title and status */}
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg sm:text-xl font-semibold text-foreground leading-tight line-clamp-2 mb-2">
                    {exercicio.titulo}
                  </h3>
                  
                  {/* Badges */}
                  <div className="flex flex-wrap gap-2 mb-3">
                    <Badge variant={exercicio.ativo ? "default" : "secondary"}>
                      {exercicio.ativo ? "Ativo" : "Inativo"}
                    </Badge>
                    
                    {/* Badge de status do período */}
                    {(() => {
                      const availability = getExerciseAvailability(exercicio);
                      if (availability.status === 'encerrado') {
                        return (
                          <Badge variant="destructive" className="bg-red-100 text-red-800 border-red-200">
                            ⏰ Encerrado
                          </Badge>
                        );
                      } else if (availability.status === 'agendado') {
                        return (
                          <Badge variant="secondary" className="bg-blue-100 text-blue-800 border-blue-200">
                            📅 Agendado
                          </Badge>
                        );
                      } else if (availability.status === 'disponivel' && (exercicio.data_inicio || exercicio.data_fim)) {
                        return (
                          <Badge variant="secondary" className="bg-green-100 text-green-800 border-green-200">
                            ✅ Disponível
                          </Badge>
                        );
                      }
                      return null;
                    })()}
                    
                    <Badge variant={kindBadge.variant}>
                      {kindBadge.label}
                    </Badge>
                    {exercicio.temas?.eixo_tematico && (
                      <Badge variant="outline">
                        {exercicio.temas.eixo_tematico}
                      </Badge>
                    )}
                    {exercicio.permite_visitante && (
                      <Badge variant="outline">Abre Embutido</Badge>
                    )}
                  </div>
                </div>

                {/* Desktop Actions */}
                <div className="hidden sm:flex gap-2 flex-shrink-0">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => onEdit(exercicio)}
                  >
                    <Edit2 className="w-4 h-4" />
                  </Button>
                  <Button 
                    variant={exercicio.ativo ? "secondary" : "default"}
                    size="sm"
                    onClick={() => onToggleActive(exercicio)}
                  >
                    <Power className="w-4 h-4" />
                  </Button>
                  {exercicio.link_forms && (
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => window.open(exercicio.link_forms, '_blank')}
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                  )}
                  <Button 
                    variant="destructive" 
                    size="sm"
                    onClick={() => onDelete(exercicio)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* Theme info */}
              {exercicio.temas?.frase_tematica && (
                <div className="text-sm text-muted-foreground">
                  <strong>Tema:</strong> {exercicio.temas.frase_tematica}
                </div>
              )}

              {/* Authorized classes */}
              {exercicio.turmas_autorizadas && exercicio.turmas_autorizadas.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-2">Turmas Autorizadas:</p>
                  <div className="flex flex-wrap gap-1">
                    {exercicio.turmas_autorizadas.map((turma, index) => (
                      <Badge key={index} variant="secondary" className="text-xs">
                        {turma}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Period Information */}
              {(exercicio.data_inicio || exercicio.data_fim) && (
                <div className="space-y-2">
                  <div className="text-sm text-muted-foreground">
                    <div className="flex items-center gap-2 mb-1">
                      <Calendar className="w-4 h-4" />
                      <strong>Período:</strong>
                    </div>
                    <div className="ml-6 text-xs">
                      {formatExercisePeriod(
                        exercicio.data_inicio,
                        exercicio.hora_inicio,
                        exercicio.data_fim,
                        exercicio.hora_fim
                      )}
                    </div>
                  </div>
                  
                  {/* Status do exercício */}
                  <div className="text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      <span className="italic">
                        {(() => {
                          const availability = getExerciseAvailability(exercicio);
                          return availability.message || 'Status indisponível';
                        })()}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Creation date */}
              <div className="text-sm text-muted-foreground">
                <strong>Criado em:</strong> {formatCreationDate(exercicio.criado_em)}
              </div>

              {/* Mobile Actions */}
              <div className="flex sm:hidden gap-2 pt-2 border-t">
                <Button 
                  variant="outline" 
                  size="sm"
                  className="flex-1"
                  onClick={() => onEdit(exercicio)}
                >
                  <Edit2 className="w-4 h-4 mr-1" />
                  Editar
                </Button>
                <Button 
                  variant={exercicio.ativo ? "secondary" : "default"}
                  size="sm"
                  className="flex-1"
                  onClick={() => onToggleActive(exercicio)}
                >
                  <Power className="w-4 h-4 mr-1" />
                  {exercicio.ativo ? "Desativar" : "Ativar"}
                </Button>
                {exercicio.link_forms && (
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => window.open(exercicio.link_forms, '_blank')}
                  >
                    <Eye className="w-4 h-4" />
                  </Button>
                )}
                <Button 
                  variant="destructive" 
                  size="sm"
                  onClick={() => onDelete(exercicio)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};