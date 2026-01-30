import { useState } from "react";
import { Edit2, Trash2, MoreVertical, Heart, MessageCircle, Send, ChevronDown, ChevronUp } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
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
} from "@/components/ui/alert-dialog";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ObraNovaForm } from "./ObraNovaForm";
import {
  RepertorioObra,
  RepertorioObraComentario,
  CurtidasObraResumo,
  TipoObra,
  getCreatorLabel,
} from "@/hooks/useRepertorioObras";
import { getEixoColors, EixoTematico } from "@/utils/eixoTematicoCores";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface ObraCardProps {
  obra: RepertorioObra;
  curtidasResumo: CurtidasObraResumo;
  comentarios: RepertorioObraComentario[];
  usuarioAtualId?: string;
  usuarioNome?: string;
  isAdmin?: boolean;
  podeCurtir?: boolean;
  podeComentarFlag?: boolean;
  onCurtir: (obraId: string) => void;
  onEditar: (
    id: string,
    tipo_obra: TipoObra,
    titulo: string,
    criador: string,
    sinopse: string,
    eixo_tematico: EixoTematico
  ) => void;
  onExcluir: (id: string) => void;
  onAdicionarComentario: (obraId: string, comentario: string) => void;
  onEditarComentario: (id: string, comentario: string) => void;
  onExcluirComentario: (id: string) => void;
  isCurtindo?: boolean;
  isComentando?: boolean;
}

// Ícones para tipos de obra
const getTipoObraIcon = (tipo: TipoObra): string => {
  switch (tipo) {
    case 'Livro': return '📚';
    case 'Filme': return '🎬';
    case 'Série': return '📺';
    case 'Documentário': return '🎥';
    case 'Peça teatral': return '🎭';
    case 'Música': return '🎵';
    case 'Podcast': return '🎙️';
    default: return '🎨';
  }
};

export const ObraCard = ({
  obra,
  curtidasResumo,
  comentarios,
  usuarioAtualId,
  usuarioNome,
  isAdmin = false,
  podeCurtir = true,
  podeComentarFlag = true,
  onCurtir,
  onEditar,
  onExcluir,
  onAdicionarComentario,
  onEditarComentario,
  onExcluirComentario,
  isCurtindo = false,
  isComentando = false,
}: ObraCardProps) => {
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [novoComentario, setNovoComentario] = useState("");
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingCommentText, setEditingCommentText] = useState("");

  const isPropriaObra = usuarioAtualId === obra.autor_id;
  const podeEditar = isPropriaObra || isAdmin;
  const podeExcluir = isPropriaObra || isAdmin;

  const colors = getEixoColors(obra.eixo_tematico);
  const creatorLabel = getCreatorLabel(obra.tipo_obra);

  const handleCurtir = () => {
    if (!isPropriaObra && podeCurtir) {
      onCurtir(obra.id);
    }
  };

  const handleEditar = (
    tipo_obra: TipoObra,
    titulo: string,
    criador: string,
    sinopse: string,
    eixo_tematico: EixoTematico
  ) => {
    onEditar(obra.id, tipo_obra, titulo, criador, sinopse, eixo_tematico);
    setShowEditModal(false);
  };

  const handleConfirmarExclusao = () => {
    onExcluir(obra.id);
    setShowDeleteDialog(false);
  };

  const handleEnviarComentario = () => {
    if (novoComentario.trim() && usuarioAtualId) {
      onAdicionarComentario(obra.id, novoComentario.trim());
      setNovoComentario("");
    }
  };

  const handleSalvarEdicaoComentario = (id: string) => {
    if (editingCommentText.trim()) {
      onEditarComentario(id, editingCommentText.trim());
      setEditingCommentId(null);
      setEditingCommentText("");
    }
  };

  const getInitials = (nome: string) => {
    return nome
      .split(' ')
      .map(n => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  };

  return (
    <>
      <Card
        className={cn(
          "relative overflow-hidden transition-all hover:shadow-lg",
          "border-l-4",
          colors.borderSide,
          colors.border
        )}
      >
        {/* Gradiente de fundo sutil */}
        <div className={cn("absolute inset-0 bg-gradient-to-br opacity-30", colors.gradient)} />

        <CardContent className="relative p-4 space-y-3">
          {/* Header: Tipo de obra + Eixo + Menu */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="secondary" className="text-xs font-medium gap-1">
                {getTipoObraIcon(obra.tipo_obra)} {obra.tipo_obra}
              </Badge>
              <Badge className={cn("text-xs font-medium", colors.bg, colors.text, colors.border)}>
                {obra.eixo_tematico}
              </Badge>
            </div>

            {(podeEditar || podeExcluir) && (
              <DropdownMenu modal={false}>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {podeEditar && (
                    <DropdownMenuItem
                      onSelect={(e) => {
                        e.preventDefault();
                        setShowEditModal(true);
                      }}
                    >
                      <Edit2 className="h-4 w-4 mr-2" />
                      Editar
                    </DropdownMenuItem>
                  )}
                  {podeExcluir && (
                    <DropdownMenuItem
                      onSelect={(e) => {
                        e.preventDefault();
                        setShowDeleteDialog(true);
                      }}
                      className="text-red-600 focus:text-red-600"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Excluir
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>

          {/* Título e Criador */}
          <div>
            <h3 className="font-semibold text-gray-900 text-base leading-tight">
              {obra.titulo}
            </h3>
            <p className="text-sm text-gray-600 mt-0.5">
              <span className="text-gray-500">{creatorLabel}:</span> {obra.criador}
            </p>
          </div>

          {/* Sinopse */}
          <p className="text-sm leading-relaxed text-gray-700 line-clamp-4">
            {obra.sinopse}
          </p>

          {/* Autor da publicação e data */}
          <div className="flex items-center gap-2 pt-2 border-t border-gray-200/50">
            <div
              className={cn(
                "h-7 w-7 rounded-full flex items-center justify-center text-xs font-medium flex-shrink-0",
                colors.bg,
                colors.text
              )}
            >
              {getInitials(obra.autor_nome)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-gray-700 truncate">
                {obra.autor_nome}
              </p>
              <p className="text-[10px] text-gray-500">
                {formatDistanceToNow(new Date(obra.created_at), {
                  addSuffix: true,
                  locale: ptBR,
                })}
              </p>
            </div>
          </div>

          {/* Ações: Curtir e Comentar */}
          <div className="flex items-center gap-4 pt-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCurtir}
              disabled={isCurtindo || isPropriaObra || !podeCurtir}
              className={cn(
                "h-8 px-2 gap-1.5",
                curtidasResumo.usuarioCurtiu && "text-red-500"
              )}
            >
              <Heart
                className={cn(
                  "h-4 w-4",
                  curtidasResumo.usuarioCurtiu && "fill-current"
                )}
              />
              <span className="text-xs">{curtidasResumo.total}</span>
            </Button>

            <Collapsible open={showComments} onOpenChange={setShowComments}>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 px-2 gap-1.5">
                  <MessageCircle className="h-4 w-4" />
                  <span className="text-xs">{comentarios.length}</span>
                  {showComments ? (
                    <ChevronUp className="h-3 w-3" />
                  ) : (
                    <ChevronDown className="h-3 w-3" />
                  )}
                </Button>
              </CollapsibleTrigger>
            </Collapsible>
          </div>

          {/* Seção de Comentários (collapsible) */}
          <Collapsible open={showComments} onOpenChange={setShowComments}>
            <CollapsibleContent className="space-y-3 pt-2">
              {/* Lista de comentários */}
              {comentarios.length > 0 && (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {comentarios.map((comentario) => {
                    const isProprioComentario = usuarioAtualId === comentario.autor_id;
                    const podeEditarComentario = isProprioComentario || isAdmin;
                    const isEditing = editingCommentId === comentario.id;

                    return (
                      <div
                        key={comentario.id}
                        className="bg-gray-50 rounded-lg p-2 text-sm"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-1.5">
                            <span className="font-medium text-gray-800 text-xs">
                              {comentario.autor_nome}
                            </span>
                            <span className="text-gray-400 text-[10px]">
                              {formatDistanceToNow(new Date(comentario.created_at), {
                                addSuffix: true,
                                locale: ptBR,
                              })}
                            </span>
                            {comentario.updated_at !== comentario.created_at && (
                              <span className="text-gray-400 text-[10px]">(editado)</span>
                            )}
                          </div>
                          {podeEditarComentario && !isEditing && (
                            <DropdownMenu modal={false}>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-5 w-5 p-0">
                                  <MoreVertical className="h-3 w-3" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                  onSelect={() => {
                                    setEditingCommentId(comentario.id);
                                    setEditingCommentText(comentario.comentario);
                                  }}
                                >
                                  <Edit2 className="h-3 w-3 mr-2" />
                                  Editar
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onSelect={() => onExcluirComentario(comentario.id)}
                                  className="text-red-600 focus:text-red-600"
                                >
                                  <Trash2 className="h-3 w-3 mr-2" />
                                  Excluir
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}
                        </div>
                        {isEditing ? (
                          <div className="mt-1 space-y-1">
                            <Textarea
                              value={editingCommentText}
                              onChange={(e) => setEditingCommentText(e.target.value)}
                              className="text-xs min-h-[60px]"
                            />
                            <div className="flex gap-1">
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-6 text-xs"
                                onClick={() => {
                                  setEditingCommentId(null);
                                  setEditingCommentText("");
                                }}
                              >
                                Cancelar
                              </Button>
                              <Button
                                size="sm"
                                className="h-6 text-xs"
                                onClick={() => handleSalvarEdicaoComentario(comentario.id)}
                              >
                                Salvar
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <p className="text-gray-700 mt-0.5 text-xs leading-relaxed">
                            {comentario.comentario}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Campo para novo comentário */}
              {podeComentarFlag && usuarioAtualId && (
                <div className="flex gap-2">
                  <Textarea
                    placeholder="Adicione um comentário sobre esta obra..."
                    value={novoComentario}
                    onChange={(e) => setNovoComentario(e.target.value)}
                    className="text-xs min-h-[60px] flex-1"
                  />
                  <Button
                    size="sm"
                    onClick={handleEnviarComentario}
                    disabled={!novoComentario.trim() || isComentando}
                    className="h-auto"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </CollapsibleContent>
          </Collapsible>
        </CardContent>
      </Card>

      {/* Modal de edição */}
      <ObraNovaForm
        open={showEditModal}
        onOpenChange={setShowEditModal}
        onSubmit={handleEditar}
        initialData={{
          tipo_obra: obra.tipo_obra,
          titulo: obra.titulo,
          criador: obra.criador,
          sinopse: obra.sinopse,
          eixo_tematico: obra.eixo_tematico,
        }}
        isEditing
      />

      {/* Dialog de confirmação de exclusão */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir obra?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. A obra, suas curtidas e comentários serão permanentemente removidos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmarExclusao}
              className="bg-red-600 hover:bg-red-700"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
