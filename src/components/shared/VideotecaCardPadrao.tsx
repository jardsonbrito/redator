import { useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { MoreVertical, Play, AlertTriangle, Globe, Eye, EyeOff, Edit, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export interface VideotecaVideoData {
  id: string;
  titulo: string;
  url: string;
  eixo_tematico?: string;
  plataforma?: 'youtube' | 'instagram' | string;
  data_publicacao?: string;
  publicado?: boolean;
  thumbnail_url?: string;
  is_novo?: boolean;
}

export interface VideotecaCardActions {
  onAssistir?: (video: VideotecaVideoData) => void;
  onEditar?: (video: VideotecaVideoData) => void;
  onExcluir?: (videoId: string) => void;
  onPublicar?: (videoId: string) => void;
  onDespublicar?: (videoId: string) => void;
}

interface VideotecaCardPadraoProps {
  video: VideotecaVideoData;
  perfil: 'aluno' | 'admin' | 'corretor';
  actions?: VideotecaCardActions;
}

export const VideotecaCardPadrao = ({ video, perfil, actions }: VideotecaCardPadraoProps) => {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return format(date, 'dd/MM/yyyy', { locale: ptBR });
    } catch {
      return 'Data não disponível';
    }
  };

  const getPlataformaBadgeColor = (plataforma?: string) => {
    switch (plataforma?.toLowerCase()) {
      case 'youtube':
        return 'bg-red-100 text-red-700';
      case 'instagram':
        return 'bg-pink-100 text-pink-700';
      default:
        return 'bg-blue-100 text-blue-700';
    }
  };

  const handleDeleteConfirm = () => {
    if (actions?.onExcluir) {
      actions.onExcluir(video.id);
    }
    setShowDeleteDialog(false);
  };

  const renderActions = () => {
    if (perfil === 'admin') {
      return (
        <div className="flex justify-end items-center">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-full bg-gray-100 hover:bg-gray-200">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {video.publicado ? (
                <DropdownMenuItem onClick={() => actions?.onDespublicar?.(video.id)}>
                  <EyeOff className="h-4 w-4 mr-2" />
                  Despublicar
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem onClick={() => actions?.onPublicar?.(video.id)}>
                  <Eye className="h-4 w-4 mr-2" />
                  Publicar
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={() => actions?.onEditar?.(video)}>
                <Edit className="h-4 w-4 mr-2" />
                Editar
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setShowDeleteDialog(true)}
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Excluir
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      );
    }

    // Para aluno e corretor
    return (
      <div className="flex justify-center">
        <Button
          onClick={() => actions?.onAssistir?.(video)}
          className="w-full bg-purple-600 hover:bg-purple-700 text-sm sm:text-base py-2 sm:py-2.5 touch-manipulation"
          size="default"
        >
          <Play className="h-4 w-4 mr-1 sm:mr-2" />
          Assistir
        </Button>
      </div>
    );
  };

  return (
    <>
      <Card className="overflow-hidden hover:shadow-lg transition-shadow">
        <CardHeader className="p-0">
          <div className="relative aspect-video bg-gray-200 rounded-t-lg overflow-hidden">
            {video.thumbnail_url ? (
              <img
                src={video.thumbnail_url}
                alt={video.titulo}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-100 to-violet-100">
                <Play className="h-12 w-12 text-purple-400" />
              </div>
            )}

            {/* Badges sobrepostas na imagem */}
            <div className="absolute top-1 left-1 sm:top-2 sm:left-2 flex flex-wrap gap-1 max-w-[calc(100%-3rem)]">
              {video.eixo_tematico && (
                <Badge className="bg-purple-100 text-purple-700 text-xs sm:text-xs px-1.5 py-0.5 truncate">
                  {video.eixo_tematico}
                </Badge>
              )}
              {/* Plataforma - para todos os perfis */}
              {video.plataforma && (
                <Badge className={`${getPlataformaBadgeColor(video.plataforma)} text-xs sm:text-xs px-1.5 py-0.5`}>
                  {video.plataforma === 'youtube' ? 'YouTube' :
                   video.plataforma === 'instagram' ? 'Instagram' :
                   video.plataforma}
                </Badge>
              )}
              {/* Status de publicação - apenas para admin */}
              {perfil === 'admin' && video.publicado !== undefined && (
                <Badge className={video.publicado ? 'bg-green-100 text-green-700 text-xs px-1.5 py-0.5' : 'bg-gray-100 text-gray-700 text-xs px-1.5 py-0.5'}>
                  {video.publicado ? 'Publicado' : 'Rascunho'}
                </Badge>
              )}
            </div>

            {video.is_novo && (
              <Badge className="absolute top-1 right-1 sm:top-2 sm:right-2 bg-red-500 text-white text-xs px-1.5 py-0.5 sm:px-2 sm:py-1">
                Novo
              </Badge>
            )}
          </div>
        </CardHeader>

        <CardContent className="p-3 sm:p-6">
          <div className="space-y-3 sm:space-y-4">
            <div className="space-y-1 sm:space-y-2">
              <h3 className="font-semibold text-base sm:text-lg text-gray-900 line-clamp-2 min-h-0 leading-tight">
                {video.titulo}
              </h3>

              {/* Data de publicação - apenas para admin */}
              {perfil === 'admin' && video.data_publicacao && (
                <p className="text-xs sm:text-sm text-muted-foreground">
                  {formatDate(video.data_publicacao)}
                </p>
              )}
            </div>

            {renderActions()}
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent className="max-w-md mx-4">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-500" />
              Confirmar Exclusão
            </AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este vídeo? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <AlertDialogCancel className="w-full sm:w-auto">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="w-full sm:w-auto bg-red-600 hover:bg-red-700"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};