import { ReactNode } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { getTemaCoverUrl } from '@/utils/temaImageUtils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
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
import { MoreVertical, Edit, Eye, EyeOff, Trash2, AlertTriangle } from 'lucide-react';

export interface TemaCardData {
  id: string;
  frase_tematica: string;
  eixo_tematico: string;
  status: string;
  published_at?: string;
  publicado_em?: string;
  created_at?: string;
  scheduled_publish_at?: string;
  imagem_url?: string;
  video_url?: string;
  imagem_texto_4_url?: string;
}

interface TemaCardActions {
  onEditar?: (id: string) => void;
  onToggleStatus?: (id: string, currentStatus: string) => void;
  onExcluir?: (id: string) => void;
  onVerTema?: (id: string) => void;
}

interface TemaCardProps {
  tema: TemaCardData;
  perfil: 'admin' | 'aluno' | 'corretor';
  actions: TemaCardActions;
  className?: string;
}

const getStatusInfo = (tema: TemaCardData) => {
  const now = new Date();
  const scheduledDate = tema.scheduled_publish_at ? new Date(tema.scheduled_publish_at) : null;

  if (tema.status === 'publicado') {
    return {
      label: 'Publicado',
      variant: 'default' as const,
      bgColor: 'bg-blue-600'
    };
  }

  if (scheduledDate && scheduledDate > now) {
    return {
      label: 'Agendado',
      variant: 'secondary' as const,
      bgColor: 'bg-yellow-500'
    };
  }

  if (scheduledDate && scheduledDate <= now) {
    return {
      label: 'Pendente',
      variant: 'destructive' as const,
      bgColor: 'bg-orange-500'
    };
  }

  return {
    label: 'Rascunho',
    variant: 'secondary' as const,
    bgColor: 'bg-purple-600'
  };
};

const getFormattedDate = (tema: TemaCardData) => {
  const publishedDate = tema.published_at || tema.publicado_em;
  if (publishedDate) {
    return format(new Date(publishedDate), "dd/MM/yyyy", { locale: ptBR });
  }

  if (tema.created_at) {
    return format(new Date(tema.created_at), "dd/MM/yyyy", { locale: ptBR });
  }

  return null;
};

export const TemaCardPadrao = ({ tema, perfil, actions, className = '' }: TemaCardProps) => {
  const statusInfo = getStatusInfo(tema);
  const formattedDate = getFormattedDate(tema);

  const handleExcluir = () => {
    if (actions.onExcluir) {
      actions.onExcluir(tema.id);
    }
  };

  return (
    <Card className={`bg-white rounded-xl shadow-md overflow-hidden hover:shadow-lg transition-all duration-300 border-gray-200 flex flex-col h-full ${className}`}>
      {/* Imagem + badges */}
      <div className="relative">
        <div className="w-full h-40 sm:h-44 md:h-40 overflow-hidden">
          <img
            src={getTemaCoverUrl(tema)}
            alt={`Capa do tema: ${tema.frase_tematica}`}
            className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.src = '/lovable-uploads/66db3418-766f-47b9-836b-07a6a228a79c.png';
            }}
          />
        </div>

        {/* Badge do eixo temático */}
        <Badge className="absolute top-2 left-2 bg-green-500 hover:bg-green-600 text-white text-xs px-2 py-1 shadow-sm">
          {tema.eixo_tematico}
        </Badge>

        {/* Badge de status - apenas para administradores */}
        {perfil === 'admin' && (
          <Badge className={`absolute top-2 right-2 text-white text-xs px-2 py-1 shadow-sm ${statusInfo.bgColor}`}>
            {statusInfo.label}
          </Badge>
        )}
      </div>

      {/* Conteúdo */}
      <div className="p-4 flex-1 flex flex-col">
        <h3 className="text-sm sm:text-base font-semibold text-gray-900 line-clamp-3 mb-2 leading-tight">
          {tema.frase_tematica}
        </h3>
        <div className="flex-1"></div>
      </div>

      {/* Rodapé condicional */}
      <div className="px-4 py-3 border-t border-gray-100 mt-auto">
        {perfil === 'admin' ? (
          <div className="flex items-center justify-between">
            {/* Data à esquerda */}
            <div className="text-xs text-gray-500 flex items-center gap-1">
              <span>📅</span>
              <span className="hidden sm:inline">{formattedDate || 'Sem data'}</span>
              <span className="sm:hidden">{formattedDate?.split('/').slice(0, 2).join('/') || 'S/D'}</span>
            </div>

            {/* Menu de ações */}
            <DropdownMenu>
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
                  onClick={() => actions.onEditar?.(tema.id)}
                  className="flex items-center cursor-pointer hover:bg-gray-50 transition-colors"
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Editar
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => actions.onToggleStatus?.(tema.id, tema.status)}
                  className="flex items-center cursor-pointer hover:bg-gray-50 transition-colors"
                >
                  {tema.status === 'publicado' ? (
                    <>
                      <EyeOff className="h-4 w-4 mr-2" />
                      Tornar Rascunho
                    </>
                  ) : (
                    <>
                      <Eye className="h-4 w-4 mr-2" />
                      Publicar
                    </>
                  )}
                </DropdownMenuItem>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <DropdownMenuItem
                      onSelect={(e) => e.preventDefault()}
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
                        Tem certeza que deseja excluir este tema? Esta ação não pode ser desfeita.
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
          <Button
            onClick={() => actions.onVerTema?.(tema.id)}
            className="w-full bg-purple-600 text-white py-2.5 px-4 rounded-lg text-sm font-medium hover:bg-purple-700 transition-all duration-200 shadow-sm hover:shadow-md"
          >
            Ver Tema Completo
          </Button>
        )}
      </div>
    </Card>
  );
};