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


  return (
    <Card className={`overflow-hidden hover:shadow-lg transition-shadow duration-300 bg-white border border-gray-200 rounded-2xl ${isDisabled ? 'opacity-60' : ''}`} role="listitem">
      {/* Capa - Always on top with 16:9 ratio */}
      <div className="aspect-[16/9] overflow-hidden rounded-t-2xl bg-gradient-to-br from-purple-100 to-purple-200">
        <img
          src={imageSources && imageSources[currentImageIndex] ? imageSources[currentImageIndex] : '/placeholders/aula-cover.png'}
          alt={`Capa do exercício: ${exercise.titulo}`}
          className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
          onError={handleImageError}
          loading="lazy"
        />
      </div>

      {/* Content */}
      <div className="p-4 md:p-5">
        <div className="space-y-3">
          {/* Title and Desktop Admin Actions */}
          <div className="flex items-start justify-between gap-3">
            <h3 className="font-semibold text-lg text-gray-900 leading-tight line-clamp-2 flex-1">
              {exercise.titulo}
            </h3>
            
            {/* Desktop Admin Actions */}
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
          </div>

          {/* Badges */}
          <div className="flex flex-wrap items-center gap-2">
            {getStatusBadge()}
            <Badge variant="outline" className="text-xs font-medium">
              {exercise.tipo}
            </Badge>
            {exercise.temas && (
              <Badge variant="secondary" className="text-xs bg-purple-100 text-purple-700">
                {exercise.temas.eixo_tematico}
              </Badge>
            )}
          </div>

          {/* Period Information */}
          <div className="space-y-1 text-sm text-gray-600">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              <span>{periodText}</span>
            </div>
            {availability.message && (
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                <span className="italic">{availability.message}</span>
              </div>
            )}
          </div>

          {/* Authorized Classes */}
          {exercise.turmas_autorizadas && exercise.turmas_autorizadas.length > 0 && (
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-gray-500" />
              <div className="flex flex-wrap gap-1">
                {exercise.turmas_autorizadas.slice(0, 4).map((turma) => (
                  <span
                    key={turma}
                    className="px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded-full font-medium"
                  >
                    {turma}
                  </span>
                ))}
                {exercise.turmas_autorizadas.length > 4 && (
                  <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full font-medium">
                    +{exercise.turmas_autorizadas.length - 4}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Actions */}
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
                /* Student Actions - Full width button */
                availability.status === 'agendado' ? (
                  <Button variant="outline" size="sm" disabled className="w-full">
                    <Clock className="w-4 h-4 mr-2" />
                    Agendado
                  </Button>
                ) : availability.status === 'encerrado' ? (
                  <Button variant="outline" size="sm" disabled className="w-full">
                    <Clock className="w-4 h-4 mr-2" />
                    Encerrado
                  </Button>
                ) : (
                  onAction && (
                    <Button 
                      className="w-full bg-purple-600 hover:bg-purple-700 text-white"
                      size="sm" 
                      onClick={() => onAction(exercise)}
                      disabled={isDisabled}
                    >
                      {exercise.tipo === 'Google Forms' ? (
                        <><ExternalLink className="w-4 h-4 mr-2" /> Abrir Formulário</>
                      ) : (
                        <><FileText className="w-4 h-4 mr-2" /> Escrever Redação</>
                      )}
                    </Button>
                  )
                )
              )}
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}