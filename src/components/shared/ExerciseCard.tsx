import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, Users } from "lucide-react";
import { useState, ReactNode } from "react";

const PLACEHOLDER = "/placeholders/aula-cover.png";

export type ExerciseStatus = "agendado" | "disponivel" | "encerrado";
export type ExerciseKind = "google_forms" | "frase_tematica";

interface ExerciseCardProps {
  coverUrl?: string;
  title: string;
  status: ExerciseStatus;
  kind: ExerciseKind;
  startAt?: string;
  endAt?: string;
  availableFrom?: string;
  classes?: string[];
  tags?: string[];
  rightActionsDesktop?: ReactNode;
  bottomActionsMobile?: ReactNode;
  showActions?: boolean;
  onAction?: () => void;
}

export default function ExerciseCard({
  coverUrl = PLACEHOLDER,
  title,
  status,
  kind,
  startAt,
  endAt,
  availableFrom,
  classes = [],
  tags = [],
  rightActionsDesktop,
  bottomActionsMobile,
  showActions = false,
  onAction
}: ExerciseCardProps) {
  const [imageError, setImageError] = useState(false);

  const getStatusBadge = () => {
    switch (status) {
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

  const getKindBadge = () => {
    switch (kind) {
      case 'google_forms':
        return <Badge variant="outline" className="text-xs">Google Forms</Badge>;
      case 'frase_tematica':
        return <Badge variant="outline" className="text-xs">Redação com Frase Temática</Badge>;
      default:
        return null;
    }
  };

  const formatPeriod = () => {
    if (!startAt || !endAt) return 'Período não definido';
    
    try {
      const start = new Date(startAt);
      const end = new Date(endAt);
      
      const startStr = start.toLocaleDateString('pt-BR', { 
        day: '2-digit', 
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      });
      const endStr = end.toLocaleDateString('pt-BR', { 
        day: '2-digit', 
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      });
      
      return `${startStr} até ${endStr}`;
    } catch {
      return 'Período inválido';
    }
  };

  const formatAvailableFrom = () => {
    if (!availableFrom) return '';
    
    try {
      const date = new Date(availableFrom);
      return `Disponível a partir de ${date.toLocaleDateString('pt-BR', { 
        day: '2-digit', 
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      })}`;
    } catch {
      return '';
    }
  };

  const currentCover = imageError ? PLACEHOLDER : (coverUrl || PLACEHOLDER);

  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow duration-300 bg-white border border-gray-200 rounded-2xl">
      <div className="flex flex-col lg:flex-row">
        {/* Cover */}
        <div className="w-full lg:w-56 h-36 flex-shrink-0 bg-gradient-to-br from-purple-100 to-purple-200 overflow-hidden">
          <img
            src={currentCover}
            alt={`Capa do exercício: ${title}`}
            className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
            onError={() => setImageError(true)}
          />
        </div>

        {/* Content */}
        <div className="flex-1 p-4 lg:p-6">
          <div className="space-y-3">
            {/* Title and Desktop Actions */}
            <div className="flex items-start justify-between gap-3">
              <h3 className="font-semibold text-lg lg:text-xl text-gray-900 leading-tight break-words flex-1">
                {title}
              </h3>
              
              {/* Desktop Actions */}
              {showActions && rightActionsDesktop && (
                <div className="hidden lg:flex items-center gap-2">
                  {rightActionsDesktop}
                </div>
              )}
            </div>

            {/* Badges */}
            <div className="flex flex-wrap items-center gap-2">
              {getStatusBadge()}
              {getKindBadge()}
              {tags.map((tag, idx) => (
                <Badge key={idx} variant="secondary" className="text-xs bg-purple-100 text-purple-700">
                  {tag}
                </Badge>
              ))}
            </div>

            {/* Period Info */}
            <div className="space-y-1 text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                <span>{formatPeriod()}</span>
              </div>
              {availableFrom && (
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  <span className="italic">{formatAvailableFrom()}</span>
                </div>
              )}
            </div>

            {/* Authorized Classes */}
            {classes.length > 0 && (
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-gray-500" />
                <div className="flex flex-wrap gap-1">
                  {classes.slice(0, 4).map((className) => (
                    <span
                      key={className}
                      className="px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded-full font-medium"
                    >
                      {className}
                    </span>
                  ))}
                  {classes.length > 4 && (
                    <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full font-medium">
                      +{classes.length - 4}
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Mobile Actions and Student Actions */}
            {showActions && (
              <div className="pt-2">
                {bottomActionsMobile ? (
                  /* Mobile Admin Actions */
                  <div className="flex lg:hidden flex-wrap gap-2">
                    {bottomActionsMobile}
                  </div>
                ) : (
                  /* Student Actions */
                  onAction && (
                    <div className="flex items-center gap-3">
                      <button 
                        className="bg-purple-600 hover:bg-purple-700 text-white rounded-full px-6 py-2 text-sm font-medium"
                        onClick={onAction}
                        disabled={status === 'agendado' || status === 'encerrado'}
                      >
                        {kind === 'google_forms' ? 'Abrir Formulário' : 'Escrever Redação'}
                      </button>
                    </div>
                  )
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}