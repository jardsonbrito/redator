import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock, ExternalLink, FileText, Calendar, Users } from "lucide-react";
import { pickCoverImage, getExerciseAvailability, formatExercisePeriod } from "@/utils/exerciseUtils";
import { useState } from "react";

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
    if (!exercise.ativo) {
      return <Badge variant="secondary" className="bg-gray-100 text-gray-600">Inativo</Badge>;
    }
    
    switch (availability.status) {
      case 'agendado':
        return <Badge variant="secondary" className="bg-blue-100 text-blue-700">📅 Agendado</Badge>;
      case 'disponivel':
        return <Badge variant="secondary" className="bg-green-100 text-green-700">✅ Disponível</Badge>;
      case 'encerrado':
        return <Badge variant="secondary" className="bg-red-100 text-red-700">⏰ Encerrado</Badge>;
      default:
        return null;
    }
  };

  const isDisabled = !exercise.ativo || availability.status === 'encerrado' || availability.status === 'agendado';

  const handleImageError = () => {
    const nextIndex = currentImageIndex + 1;
    if (nextIndex < imageSources.length) {
      setCurrentImageIndex(nextIndex);
    }
  };

  if (!imageSources || imageSources.length === 0) {
    return null;
  }

  return (
    <Card className={`overflow-hidden hover:shadow-lg transition-shadow ${isDisabled ? 'opacity-60' : ''}`}>
      <div className="flex flex-col sm:flex-row">
        {/* Capa */}
        <div className="w-full sm:w-64 aspect-video flex-shrink-0 bg-gray-100 rounded-l-lg overflow-hidden">
          <img
            src={imageSources[currentImageIndex]}
            alt={`Capa do exercício: ${exercise.titulo}`}
            className="w-full h-full object-cover"
            style={{
              width: '100%',
              aspectRatio: '16/9',
              objectFit: 'cover',
              display: 'block'
            }}
            onError={handleImageError}
          />
        </div>

        {/* Conteúdo */}
        <CardContent className="flex-1 p-4">
          <div className="space-y-3">
            {/* Título e Status */}
            <div>
              <h4 className="font-semibold text-lg leading-tight mb-2">{exercise.titulo}</h4>
              <div className="flex flex-wrap items-center gap-2">
                {getStatusBadge()}
                <Badge variant="outline" className="text-xs">
                  {exercise.tipo}
                </Badge>
                {exercise.temas && (
                  <Badge variant="secondary" className="text-xs">
                    {exercise.temas.eixo_tematico}
                  </Badge>
                )}
              </div>
            </div>

            {/* Informações do Período */}
            <div className="text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                <span>{periodText}</span>
              </div>
              {availability.message && (
                <div className="flex items-center gap-1 mt-1">
                  <Clock className="w-3 h-3" />
                  <span className="italic">{availability.message}</span>
                </div>
              )}
            </div>

            {/* Turmas Autorizadas */}
            {exercise.turmas_autorizadas && exercise.turmas_autorizadas.length > 0 && (
              <div className="flex items-center gap-2 text-sm">
                <Users className="w-3 h-3" />
                <div className="flex flex-wrap gap-1">
                  {exercise.turmas_autorizadas.slice(0, 3).map((turma) => (
                    <Badge key={turma} variant="outline" className="text-xs">
                      {turma}
                    </Badge>
                  ))}
                  {exercise.turmas_autorizadas.length > 3 && (
                    <Badge variant="outline" className="text-xs">
                      +{exercise.turmas_autorizadas.length - 3}
                    </Badge>
                  )}
                </div>
              </div>
            )}

            {/* Ações */}
            {showActions && (
              <div className="flex flex-wrap gap-2 pt-2">
                {isAdmin ? (
                  <>
                    {onEdit && (
                      <Button variant="outline" size="sm" onClick={() => onEdit(exercise)}>
                        Editar
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
                    {exercise.link_forms && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(exercise.link_forms, '_blank')}
                      >
                        <ExternalLink className="w-3 h-3 mr-1" />
                        Ver Forms
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
                  </>
                ) : (
                  <>
                    {availability.status === 'agendado' ? (
                      <Button variant="outline" size="sm" disabled>
                        <Clock className="w-3 h-3 mr-1" />
                        Agendado
                      </Button>
                    ) : availability.status === 'encerrado' ? (
                      <Button variant="outline" size="sm" disabled>
                        <Clock className="w-3 h-3 mr-1" />
                        Encerrado
                      </Button>
                    ) : (
                      onAction && (
                        <Button 
                          variant="default" 
                          size="sm" 
                          onClick={() => onAction(exercise)}
                          disabled={isDisabled}
                        >
                          {exercise.tipo === 'Google Forms' ? (
                            <><ExternalLink className="w-3 h-3 mr-1" /> Abrir Formulário</>
                          ) : (
                            <><FileText className="w-3 h-3 mr-1" /> Escrever Redação</>
                          )}
                        </Button>
                      )
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </div>
    </Card>
  );
}