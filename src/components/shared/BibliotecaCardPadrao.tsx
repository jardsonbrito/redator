import { useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { MoreVertical, Download, Edit, Trash2, Eye, EyeOff, AlertTriangle, Calendar } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export interface BibliotecaCardData {
  id: string;
  titulo: string;
  subtitulo?: string;
  descricao?: string;
  competencia?: string;
  categoria?: string;
  status?: 'publicado' | 'rascunho';
  published_at?: string;
  unpublished_at?: string;
  thumbnail_url?: string;
  arquivo_url?: string;
  arquivo_nome?: string;
  turmas_autorizadas?: string[];
  permite_visitante?: boolean;
}

export interface BibliotecaCardActions {
  onBaixar?: (material: BibliotecaCardData) => void;
  onEditar?: (material: BibliotecaCardData) => void;
  onExcluir?: (materialId: string) => void;
  onPublicar?: (materialId: string) => void;
  onDespublicar?: (materialId: string) => void;
  onInativar?: (materialId: string) => void;
  onDownloadAdmin?: (material: BibliotecaCardData) => void;
}

interface BibliotecaCardPadraoProps {
  material: BibliotecaCardData;
  perfil: 'aluno' | 'admin' | 'corretor';
  actions?: BibliotecaCardActions;
}

export const BibliotecaCardPadrao = ({ material, perfil, actions }: BibliotecaCardPadraoProps) => {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return format(date, 'dd/MM/yyyy', { locale: ptBR });
    } catch {
      return 'Data não disponível';
    }
  };

  const getTurmasDisplay = () => {
    if (!material.turmas_autorizadas || material.turmas_autorizadas.length === 0) {
      return material.permite_visitante ? 'Visitantes' : 'Nenhuma turma';
    }

    const turmasText = material.turmas_autorizadas.join(', ');
    return material.permite_visitante ? `${turmasText}, Visitantes` : turmasText;
  };

  const handleDeleteConfirm = () => {
    if (actions?.onExcluir) {
      actions.onExcluir(material.id);
    }
    setShowDeleteDialog(false);
  };

  const renderActions = () => {
    if (perfil === 'admin') {
      return (
        <div className="flex justify-between items-center">
          <div className="flex gap-2 flex-wrap">
            {material.competencia && (
              <Badge className="bg-blue-100 text-blue-700">
                {material.competencia}
              </Badge>
            )}

            {material.status && (
              <Badge className={material.status === 'publicado' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}>
                {material.status === 'publicado' ? 'Publicado' : 'Rascunho'}
              </Badge>
            )}
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => actions?.onEditar?.(material)}>
                <Edit className="h-4 w-4 mr-2" />
                Editar
              </DropdownMenuItem>

              {material.status === 'publicado' ? (
                <DropdownMenuItem onClick={() => actions?.onDespublicar?.(material.id)}>
                  <EyeOff className="h-4 w-4 mr-2" />
                  Despublicar
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem onClick={() => actions?.onPublicar?.(material.id)}>
                  <Eye className="h-4 w-4 mr-2" />
                  Publicar
                </DropdownMenuItem>
              )}

              <DropdownMenuItem onClick={() => actions?.onDownloadAdmin?.(material)}>
                <Download className="h-4 w-4 mr-2" />
                Download
              </DropdownMenuItem>

              <DropdownMenuItem onClick={() => actions?.onInativar?.(material.id)}>
                <EyeOff className="h-4 w-4 mr-2" />
                Inativar
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
          onClick={() => actions?.onBaixar?.(material)}
          className="w-full bg-purple-600 hover:bg-purple-700"
        >
          <Download className="h-4 w-4 mr-2" />
          Baixar PDF
        </Button>
      </div>
    );
  };

  return (
    <>
      <Card className="overflow-hidden hover:shadow-lg transition-shadow">
        <CardHeader className="p-0">
          <div className="relative aspect-video bg-gray-200 rounded-t-lg overflow-hidden">
            {material.thumbnail_url ? (
              <img
                src={material.thumbnail_url}
                alt={material.titulo}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-100 to-violet-100">
                <Download className="h-12 w-12 text-purple-400" />
              </div>
            )}
          </div>
        </CardHeader>

        <CardContent className="p-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <h3 className="font-semibold text-lg text-gray-900 line-clamp-2 min-h-0">
                {material.titulo}
              </h3>

              {material.subtitulo && (
                <p className="text-sm text-muted-foreground line-clamp-1">
                  {material.subtitulo}
                </p>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              {material.categoria && (
                <Badge className="bg-purple-100 text-purple-700">
                  {material.categoria}
                </Badge>
              )}

              {material.unpublished_at && perfil !== 'admin' && (
                <Badge className="bg-orange-100 text-orange-700">
                  <Calendar className="h-3 w-3 mr-1" />
                  Agendado
                </Badge>
              )}
            </div>

            {perfil === 'admin' && (
              <div className="text-xs text-muted-foreground space-y-1">
                <p><strong>Categoria:</strong> {material.categoria}</p>
                <p><strong>Turmas:</strong> {getTurmasDisplay()}</p>
                {material.unpublished_at && (
                  <p><strong>Publicação:</strong> {formatDate(material.published_at || '')} - {formatDate(material.unpublished_at)}</p>
                )}
              </div>
            )}

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
              Tem certeza que deseja excluir este material? Esta ação não pode ser desfeita.
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