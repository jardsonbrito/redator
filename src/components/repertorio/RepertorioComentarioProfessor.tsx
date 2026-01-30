import { useState } from "react";
import { MessageSquare, Edit2, Trash2, Send, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { RepertorioComentario } from "@/hooks/useRepertorio";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
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

interface RepertorioComentarioProfessorProps {
  comentarios: RepertorioComentario[];
  podeAdicionarComentario: boolean;
  onAdicionarComentario: (comentario: string) => void;
  onEditarComentario: (id: string, comentario: string) => void;
  onExcluirComentario: (id: string) => void;
  usuarioAtualId?: string;
  isComentando?: boolean;
}

export const RepertorioComentarioProfessor = ({
  comentarios,
  podeAdicionarComentario,
  onAdicionarComentario,
  onEditarComentario,
  onExcluirComentario,
  usuarioAtualId,
  isComentando = false,
}: RepertorioComentarioProfessorProps) => {
  const [novoComentario, setNovoComentario] = useState("");
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [textoEdicao, setTextoEdicao] = useState("");
  const [excluindoId, setExcluindoId] = useState<string | null>(null);

  const handleSubmitComentario = () => {
    if (novoComentario.trim()) {
      onAdicionarComentario(novoComentario.trim());
      setNovoComentario("");
    }
  };

  const handleIniciarEdicao = (comentario: RepertorioComentario) => {
    setEditandoId(comentario.id);
    setTextoEdicao(comentario.comentario);
  };

  const handleSalvarEdicao = () => {
    if (editandoId && textoEdicao.trim()) {
      onEditarComentario(editandoId, textoEdicao.trim());
      setEditandoId(null);
      setTextoEdicao("");
    }
  };

  const handleCancelarEdicao = () => {
    setEditandoId(null);
    setTextoEdicao("");
  };

  const handleConfirmarExclusao = () => {
    if (excluindoId) {
      onExcluirComentario(excluindoId);
      setExcluindoId(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* Título da seção */}
      <div className="flex items-center gap-2 text-sm font-medium text-purple-700">
        <MessageSquare className="h-4 w-4" />
        <span>Comentário do Professor</span>
      </div>

      {/* Lista de comentários existentes */}
      {comentarios.length > 0 ? (
        <div className="space-y-3">
          {comentarios.map((comentario) => (
            <div
              key={comentario.id}
              className="bg-purple-50 rounded-lg p-3 space-y-2"
            >
              {editandoId === comentario.id ? (
                // Modo de edição
                <div className="space-y-2">
                  <Textarea
                    value={textoEdicao}
                    onChange={(e) => setTextoEdicao(e.target.value)}
                    className="min-h-[80px] bg-white"
                    placeholder="Editar comentário..."
                  />
                  <div className="flex gap-2 justify-end">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleCancelarEdicao}
                    >
                      <X className="h-4 w-4 mr-1" />
                      Cancelar
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleSalvarEdicao}
                      disabled={!textoEdicao.trim()}
                    >
                      Salvar
                    </Button>
                  </div>
                </div>
              ) : (
                // Modo de visualização
                <>
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-medium text-purple-900">
                        {comentario.autor_nome}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(comentario.created_at), {
                          addSuffix: true,
                          locale: ptBR,
                        })}
                        {comentario.updated_at !== comentario.created_at && (
                          <span className="ml-1">(editado)</span>
                        )}
                      </p>
                    </div>

                    {/* Botões de ação - apenas se for o autor do comentário ou admin */}
                    {usuarioAtualId === comentario.autor_id && (
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => handleIniciarEdicao(comentario)}
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-red-500 hover:text-red-600"
                          onClick={() => setExcluindoId(comentario.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    )}
                  </div>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">
                    {comentario.comentario}
                  </p>
                </>
              )}
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground italic">
          Nenhum comentário do professor ainda.
        </p>
      )}

      {/* Formulário para adicionar novo comentário */}
      {podeAdicionarComentario && (
        <div className="space-y-2 pt-2 border-t">
          <Textarea
            value={novoComentario}
            onChange={(e) => setNovoComentario(e.target.value)}
            placeholder="Adicionar comentário técnico..."
            className="min-h-[80px]"
          />
          <div className="flex justify-end">
            <Button
              size="sm"
              onClick={handleSubmitComentario}
              disabled={!novoComentario.trim() || isComentando}
            >
              <Send className="h-4 w-4 mr-1" />
              {isComentando ? "Enviando..." : "Enviar Comentário"}
            </Button>
          </div>
        </div>
      )}

      {/* Dialog de confirmação de exclusão */}
      <AlertDialog open={!!excluindoId} onOpenChange={() => setExcluindoId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir comentário?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O comentário será permanentemente removido.
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
    </div>
  );
};
