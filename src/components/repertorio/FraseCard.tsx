import { useState } from "react";
import { Edit2, Trash2, MoreVertical } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { FraseCurtidaButton } from "./FraseCurtidaButton";
import { FraseNovaForm } from "./FraseNovaForm";
import { RepertorioFrase, CurtidasResumo } from "@/hooks/useRepertorioFrases";
import { getEixoColors, EixoTematico } from "@/utils/eixoTematicoCores";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface FraseCardProps {
  frase: RepertorioFrase;
  curtidasResumo: CurtidasResumo;
  usuarioAtualId?: string;
  isAdmin?: boolean;
  podeCurtir?: boolean;
  onCurtir: (fraseId: string) => void;
  onEditar: (id: string, frase: string, eixo_tematico: EixoTematico, autoria?: string) => void;
  onExcluir: (id: string) => void;
  isCurtindo?: boolean;
}

export const FraseCard = ({
  frase,
  curtidasResumo,
  usuarioAtualId,
  isAdmin = false,
  podeCurtir = true,
  onCurtir,
  onEditar,
  onExcluir,
  isCurtindo = false,
}: FraseCardProps) => {
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const isPropriaFrase = usuarioAtualId === frase.autor_id;
  const podeEditar = isPropriaFrase || isAdmin;
  const podeExcluir = isPropriaFrase || isAdmin;

  const colors = getEixoColors(frase.eixo_tematico);

  const handleCurtir = () => {
    if (!isPropriaFrase) {
      onCurtir(frase.id);
    }
  };

  const handleEditar = (novaFrase: string, novoEixo: EixoTematico, novaAutoria?: string) => {
    onEditar(frase.id, novaFrase, novoEixo, novaAutoria);
    setShowEditModal(false);
  };

  const handleConfirmarExclusao = () => {
    onExcluir(frase.id);
    setShowDeleteDialog(false);
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
        <div className={cn("absolute inset-0 bg-gradient-to-br opacity-50", colors.gradient)} />

        <CardContent className="relative p-4 space-y-3">
          {/* Header: Badge do eixo + Menu de ações */}
          <div className="flex items-start justify-between gap-2">
            <Badge className={cn("text-xs font-medium", colors.bg, colors.text, colors.border)}>
              {frase.eixo_tematico}
            </Badge>

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

          {/* Texto da frase */}
          <div className="min-h-[60px] space-y-1">
            <p className="text-sm leading-relaxed text-gray-800">
              "{frase.frase}"
            </p>
            {frase.autoria && (
              <p className="text-xs text-gray-500 italic">
                — {frase.autoria}
              </p>
            )}
          </div>

          {/* Rodapé: autor, data e curtidas */}
          <div className="flex items-center justify-between pt-2 border-t border-gray-200/50">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <div
                className={cn(
                  "h-7 w-7 rounded-full flex items-center justify-center text-xs font-medium flex-shrink-0",
                  colors.bg,
                  colors.text
                )}
              >
                {getInitials(frase.autor_nome)}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium text-gray-700 truncate">
                  {frase.autor_nome}
                </p>
                <p className="text-[10px] text-gray-500">
                  {formatDistanceToNow(new Date(frase.created_at), {
                    addSuffix: true,
                    locale: ptBR,
                  })}
                </p>
              </div>
            </div>

            <FraseCurtidaButton
              totalCurtidas={curtidasResumo.total}
              usuarioCurtiu={curtidasResumo.usuarioCurtiu}
              onCurtir={handleCurtir}
              isCurtindo={isCurtindo}
              disabled={!podeCurtir}
              isPropriaFrase={isPropriaFrase}
            />
          </div>
        </CardContent>
      </Card>

      {/* Modal de edição */}
      <FraseNovaForm
        open={showEditModal}
        onOpenChange={setShowEditModal}
        onSubmit={handleEditar}
        initialData={{
          frase: frase.frase,
          eixo_tematico: frase.eixo_tematico,
          autoria: frase.autoria,
        }}
        isEditing
      />

      {/* Dialog de confirmação de exclusão */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir frase?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. A frase e suas curtidas serão permanentemente removidas.
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
