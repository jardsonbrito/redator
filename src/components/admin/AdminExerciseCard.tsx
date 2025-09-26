import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Edit, Trash2, Eye, Power, MoreHorizontal, Calendar, Users } from "lucide-react";
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

  const getStatusBadge = () => {
    if (!exercicio.ativo) {
      return <Badge className="bg-gray-100 text-gray-700 text-xs font-medium">Rascunho</Badge>;
    }

    const availability = getExerciseAvailability(exercicio);
    switch (availability.status) {
      case 'agendado':
        return <Badge className="bg-orange-100 text-orange-700 text-xs font-medium">Indisponível</Badge>;
      case 'disponivel':
        return <Badge className="bg-green-100 text-green-700 text-xs font-medium">Disponível</Badge>;
      case 'encerrado':
        return <Badge className="bg-red-100 text-red-700 text-xs font-medium">Indisponível</Badge>;
      default:
        return <Badge className="bg-green-100 text-green-700 text-xs font-medium">Disponível</Badge>;
    }
  };

  return (
    <Card className="overflow-hidden shadow-md rounded-2xl border border-gray-200 bg-white">
      {/* Capa - Always on top with 16:9 ratio */}
      <div className="aspect-[16/9] overflow-hidden bg-gradient-to-br from-purple-100 to-purple-200 relative">
        <img
          src={getCoverImage()}
          alt={`Capa do exercício: ${exercicio.titulo}`}
          className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
          onError={(e) => {
            e.currentTarget.src = "/placeholders/aula-cover.png";
          }}
          loading="lazy"
        />

        {/* Badge de status na imagem */}
        <div className="absolute top-2 left-2">
          {getStatusBadge()}
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        <div className="space-y-4">
          {/* Cabeçalho */}
          <div className="flex justify-between items-start gap-3">
            <div className="flex-1">
              <h2 className="text-lg font-semibold text-gray-900 leading-tight mb-1">
                {exercicio.titulo}
              </h2>
              <p className="text-sm text-gray-500">
                {exercicio.tipo}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => onEdit(exercicio)}>
                    <Edit className="mr-2 h-4 w-4" />
                    Editar exercício
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onToggleActive(exercicio)}>
                    <Power className="mr-2 h-4 w-4" />
                    {exercicio.ativo ? 'Marcar como rascunho' : 'Publicar exercício'}
                  </DropdownMenuItem>
                  {exercicio.link_forms && (
                    <DropdownMenuItem onClick={() => window.open(exercicio.link_forms, '_blank')}>
                      <Eye className="mr-2 h-4 w-4" />
                      Visualizar exercício
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => onDelete(exercicio)} className="text-red-600">
                    <Trash2 className="mr-2 h-4 w-4" />
                    Excluir exercício
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Informações extras */}
          <div className="text-sm text-gray-600 space-y-2">
            {exercicio.data_inicio && exercicio.hora_inicio && (
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                <span>Início em: {new Date(`${exercicio.data_inicio}T${exercicio.hora_inicio}`).toLocaleDateString('pt-BR', {
                  day: '2-digit',
                  month: '2-digit',
                  hour: '2-digit',
                  minute: '2-digit'
                }).replace(',', ',')}</span>
              </div>
            )}
            {exercicio.data_fim && exercicio.hora_fim && (
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                <span>Término em: {new Date(`${exercicio.data_fim}T${exercicio.hora_fim}`).toLocaleDateString('pt-BR', {
                  day: '2-digit',
                  month: '2-digit',
                  hour: '2-digit',
                  minute: '2-digit'
                }).replace(',', ',')}</span>
              </div>
            )}
          </div>

          {/* Turmas associadas */}
          {exercicio.turmas_autorizadas && exercicio.turmas_autorizadas.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Users className="w-4 h-4 text-gray-500" />
                <span className="text-sm font-medium text-gray-700">Turmas associadas:</span>
              </div>
              <div className="flex flex-wrap gap-1">
                {exercicio.turmas_autorizadas.map((turma, index) => (
                  <Badge key={index} variant="secondary" className="text-xs bg-purple-100 text-purple-700">
                    {turma}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Tema vinculado */}
          {exercicio.temas?.frase_tematica && (
            <div className="text-sm text-gray-600">
              <span className="font-medium">Tema vinculado:</span> {exercicio.temas.frase_tematica}
            </div>
          )}
        </div>
      </div>
    </Card>
  );
};