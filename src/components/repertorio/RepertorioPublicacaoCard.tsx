import { useState } from "react";
import { Star, Edit2, Trash2, User } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { RepertorioVotacao } from "./RepertorioVotacao";
import { RepertorioComentarioProfessor } from "./RepertorioComentarioProfessor";
import { RepertorioNovaPublicacaoForm } from "./RepertorioNovaPublicacaoForm";
import {
  RepertorioPublicacao,
  RepertorioVoto,
  RepertorioComentario,
  calcularVotosResumo,
} from "@/hooks/useRepertorio";
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
import { cn } from "@/lib/utils";

interface RepertorioPublicacaoCardProps {
  publicacao: RepertorioPublicacao;
  votos: RepertorioVoto[];
  comentarios: RepertorioComentario[];
  usuarioAtualId?: string;
  usuarioNome?: string;
  isAdmin?: boolean;
  isProfessor?: boolean;
  podeVotar?: boolean;
  onVotar: (publicacaoId: string, voto: 'produtivo' | 'nao_produtivo') => void;
  onEditar: (id: string, fraseTematica: string, tipoParagrafo: 'introducao' | 'desenvolvimento' | 'conclusao', paragrafo: string) => void;
  onExcluir: (id: string) => void;
  onToggleDestaque: (id: string, destaque: boolean) => void;
  onAdicionarComentario: (publicacaoId: string, comentario: string) => void;
  onEditarComentario: (id: string, comentario: string) => void;
  onExcluirComentario: (id: string) => void;
  isVotando?: boolean;
  isComentando?: boolean;
}

const TIPO_PARAGRAFO_LABELS = {
  introducao: { label: 'Introdução', color: 'bg-blue-100 text-blue-800' },
  desenvolvimento: { label: 'Desenvolvimento', color: 'bg-green-100 text-green-800' },
  conclusao: { label: 'Conclusão', color: 'bg-purple-100 text-purple-800' },
};

export const RepertorioPublicacaoCard = ({
  publicacao,
  votos,
  comentarios,
  usuarioAtualId,
  usuarioNome,
  isAdmin = false,
  isProfessor = false,
  podeVotar = true,
  onVotar,
  onEditar,
  onExcluir,
  onToggleDestaque,
  onAdicionarComentario,
  onEditarComentario,
  onExcluirComentario,
  isVotando = false,
  isComentando = false,
}: RepertorioPublicacaoCardProps) => {
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const isPropriaPublicacao = usuarioAtualId === publicacao.autor_id;
  const podeEditar = isPropriaPublicacao;
  const podeExcluir = isPropriaPublicacao || isAdmin || isProfessor;
  const podeDestacar = isAdmin || isProfessor;
  const podeAdicionarComentario = isAdmin || isProfessor;

  const votosResumo = calcularVotosResumo(votos);
  const votoUsuario = votos.find(v => v.votante_id === usuarioAtualId)?.voto || null;

  const handleVotar = (voto: 'produtivo' | 'nao_produtivo') => {
    onVotar(publicacao.id, voto);
  };

  const handleEditar = (
    fraseTematica: string,
    tipoParagrafo: 'introducao' | 'desenvolvimento' | 'conclusao',
    paragrafo: string
  ) => {
    onEditar(publicacao.id, fraseTematica, tipoParagrafo, paragrafo);
    setShowEditModal(false);
  };

  const handleConfirmarExclusao = () => {
    onExcluir(publicacao.id);
    setShowDeleteDialog(false);
  };

  const tipoConfig = TIPO_PARAGRAFO_LABELS[publicacao.tipo_paragrafo];

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
      <Card className={cn(
        "transition-all hover:shadow-md",
        publicacao.destaque && "ring-2 ring-yellow-400 bg-yellow-50/30"
      )}>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            {/* Avatar e info do autor */}
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10">
                <AvatarFallback className="bg-purple-100 text-purple-700">
                  {getInitials(publicacao.autor_nome)}
                </AvatarFallback>
              </Avatar>
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-medium text-sm">{publicacao.autor_nome}</p>
                  {publicacao.destaque && (
                    <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                  )}
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  {publicacao.autor_turma && (
                    <span>{publicacao.autor_turma}</span>
                  )}
                  <span>
                    {formatDistanceToNow(new Date(publicacao.created_at), {
                      addSuffix: true,
                      locale: ptBR,
                    })}
                  </span>
                </div>
              </div>
            </div>

            {/* Badge do tipo de parágrafo */}
            <Badge className={cn("text-xs", tipoConfig.color)}>
              {tipoConfig.label}
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Frase temática */}
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-xs text-muted-foreground mb-1">Frase Temática</p>
            <p className="text-sm font-medium">{publicacao.frase_tematica}</p>
          </div>

          {/* Parágrafo */}
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Parágrafo</p>
            <p className="text-sm leading-relaxed whitespace-pre-wrap">
              {publicacao.paragrafo}
            </p>
          </div>

          {/* Votação */}
          <div className="pt-2 border-t">
            <RepertorioVotacao
              votosResumo={votosResumo}
              votoUsuario={votoUsuario}
              onVotar={handleVotar}
              isVotando={isVotando}
              podeVotar={podeVotar}
              isPropriaPublicacao={isPropriaPublicacao}
            />
          </div>

          {/* Comentário do professor */}
          {(comentarios.length > 0 || podeAdicionarComentario) && (
            <div className="pt-2 border-t">
              <RepertorioComentarioProfessor
                comentarios={comentarios}
                podeAdicionarComentario={podeAdicionarComentario}
                onAdicionarComentario={(comentario) => onAdicionarComentario(publicacao.id, comentario)}
                onEditarComentario={onEditarComentario}
                onExcluirComentario={onExcluirComentario}
                usuarioAtualId={usuarioAtualId}
                isComentando={isComentando}
              />
            </div>
          )}

          {/* Botões de ação */}
          {(podeEditar || podeExcluir || podeDestacar) && (
            <div className="pt-2 border-t flex flex-wrap gap-2">
              {podeEditar && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowEditModal(true)}
                >
                  <Edit2 className="h-4 w-4 mr-1" />
                  Editar
                </Button>
              )}
              {podeDestacar && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onToggleDestaque(publicacao.id, !publicacao.destaque)}
                  className={cn(
                    publicacao.destaque && "bg-yellow-100 hover:bg-yellow-200"
                  )}
                >
                  <Star className={cn(
                    "h-4 w-4 mr-1",
                    publicacao.destaque && "fill-yellow-500 text-yellow-500"
                  )} />
                  {publicacao.destaque ? "Remover Destaque" : "Destacar"}
                </Button>
              )}
              {podeExcluir && (
                <Button
                  variant="outline"
                  size="sm"
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  onClick={() => setShowDeleteDialog(true)}
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  Excluir
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal de edição */}
      <RepertorioNovaPublicacaoForm
        open={showEditModal}
        onOpenChange={setShowEditModal}
        onSubmit={handleEditar}
        initialData={{
          fraseTematica: publicacao.frase_tematica,
          tipoParagrafo: publicacao.tipo_paragrafo,
          paragrafo: publicacao.paragrafo,
        }}
        isEditing
      />

      {/* Dialog de confirmação de exclusão */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir publicação?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. A publicação, seus votos e comentários serão permanentemente removidos.
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
