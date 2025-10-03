import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { MoreVertical, Trash2, Copy, RotateCcw, Users, Calendar, ExternalLink, Image, Edit, Eye } from "lucide-react";

interface InboxMessage {
  id: string;
  message: string;
  type: "bloqueante" | "amigavel";
  valid_until: string | null;
  extra_link: string | null;
  extra_image: string | null;
  created_at: string;
  created_by: string;
  recipients?: {
    total: number;
    pendente: number;
    lida: number;
    respondida: number;
  };
}

interface InboxMessageCardProps {
  message: InboxMessage;
  onEdit?: (message: InboxMessage) => void;
  onView?: (message: InboxMessage) => void;
  onDuplicate?: (message: InboxMessage) => void;
  onDelete?: (messageId: string) => void;
  onReopen?: (messageId: string) => void;
  onViewRecipients?: (messageId: string, messageText: string) => void;
  isDeleting?: boolean;
  isReopening?: boolean;
}

export function InboxMessageCard({
  message,
  onEdit,
  onView,
  onDuplicate,
  onDelete,
  onReopen,
  onViewRecipients,
  isDeleting = false,
  isReopening = false,
}: InboxMessageCardProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showViewDialog, setShowViewDialog] = useState(false);

  const getStatusInfo = () => {
    if (message.type === 'bloqueante') {
      return {
        label: 'Bloqueante',
        bgColor: 'bg-red-500'
      };
    }
    return {
      label: 'Amigável',
      bgColor: 'bg-blue-500'
    };
  };

  const getValidityText = () => {
    if (!message.valid_until) return "Permanente";
    const date = new Date(message.valid_until);
    if (date < new Date()) return "Expirada";
    return format(date, "dd/MM/yyyy", { locale: ptBR });
  };

  const statusInfo = getStatusInfo();

  return (
    <>
      <Card className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-lg transition-all duration-300 border-gray-200 flex flex-col h-full">
        {/* Área de destaque (substituindo a imagem) */}
        <div className="relative bg-gradient-to-br from-purple-100 to-blue-100 h-32 flex items-center justify-center">
          <div className="text-center px-4">
            <div className={`inline-flex items-center justify-center w-16 h-16 rounded-full ${statusInfo.bgColor} text-white mb-2`}>
              <Users className="h-8 w-8" />
            </div>
          </div>

          {/* Badge de tipo */}
          <Badge className={`absolute top-2 left-2 text-white text-xs px-2 py-1 shadow-sm ${statusInfo.bgColor}`}>
            {statusInfo.label}
          </Badge>

          {/* Badge de validade */}
          <Badge className="absolute top-2 right-2 bg-gray-700 text-white text-xs px-2 py-1 shadow-sm">
            <Calendar className="h-3 w-3 mr-1 inline" />
            {getValidityText()}
          </Badge>
        </div>

        {/* Conteúdo */}
        <div className="p-4 flex-1 flex flex-col">
          <p className="text-sm text-gray-700 line-clamp-3 mb-3 leading-relaxed">
            {message.message}
          </p>

          {/* Extras */}
          {(message.extra_link || message.extra_image) && (
            <div className="flex items-center gap-2 mb-3 text-xs text-gray-500">
              {message.extra_link && (
                <span className="flex items-center">
                  <ExternalLink className="h-3 w-3 mr-1" />
                  Link
                </span>
              )}
              {message.extra_image && (
                <span className="flex items-center">
                  <Image className="h-3 w-3 mr-1" />
                  Imagem
                </span>
              )}
            </div>
          )}

          {/* Estatísticas de destinatários */}
          {message.recipients && message.recipients.total > 0 && (
            <div
              className="bg-gray-50 rounded-lg p-3 cursor-pointer hover:bg-gray-100 transition-colors"
              onClick={() => onViewRecipients?.(message.id, message.message)}
            >
              <div className="text-xs font-semibold text-gray-700 mb-2 flex items-center">
                <Users className="h-3 w-3 mr-1" />
                {message.recipients.total} destinatário{message.recipients.total !== 1 ? 's' : ''}
              </div>
              <div className="flex gap-3 text-xs">
                <span className="text-yellow-600">
                  Pendente: {message.recipients.pendente}
                </span>
                <span className="text-blue-600">
                  Lida: {message.recipients.lida}
                </span>
                <span className="text-green-600">
                  Respondida: {message.recipients.respondida}
                </span>
              </div>
            </div>
          )}

          <div className="flex-1"></div>
        </div>

        {/* Rodapé */}
        <div className="px-4 py-3 border-t border-gray-100 mt-auto">
          <div className="flex items-center justify-between">
            {/* Data à esquerda */}
            <div className="text-xs text-gray-500 flex items-center gap-1">
              <span>📅</span>
              <span className="hidden sm:inline">
                {format(new Date(message.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
              </span>
              <span className="sm:hidden">
                {format(new Date(message.created_at), "dd/MM/yy", { locale: ptBR })}
              </span>
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
              <DropdownMenuContent align="end" className="w-48 shadow-lg border border-gray-200">
                <DropdownMenuItem
                  onClick={() => setShowViewDialog(true)}
                  className="flex items-center cursor-pointer hover:bg-gray-50 transition-colors"
                >
                  <Eye className="h-4 w-4 mr-2" />
                  Ver Mensagem
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => onEdit?.(message)}
                  className="flex items-center cursor-pointer hover:bg-gray-50 transition-colors"
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Editar
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => onDuplicate?.(message)}
                  className="flex items-center cursor-pointer hover:bg-gray-50 transition-colors"
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Duplicar
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => onReopen?.(message.id)}
                  disabled={isReopening}
                  className="flex items-center cursor-pointer hover:bg-gray-50 transition-colors"
                >
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Reabrir
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setShowDeleteDialog(true)}
                  className="flex items-center cursor-pointer hover:bg-red-50 text-red-600 transition-colors"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Excluir
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </Card>

      {/* Dialog de visualização */}
      <Dialog open={showViewDialog} onOpenChange={setShowViewDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Visualizar Mensagem
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Informações da mensagem */}
            <div className="flex flex-wrap gap-2">
              <Badge className={statusInfo.bgColor + " text-white"}>
                {statusInfo.label}
              </Badge>
              <Badge variant="outline">
                <Calendar className="h-3 w-3 mr-1" />
                {getValidityText()}
              </Badge>
              {message.recipients && (
                <Badge variant="outline">
                  <Users className="h-3 w-3 mr-1" />
                  {message.recipients.total} destinatário{message.recipients.total !== 1 ? 's' : ''}
                </Badge>
              )}
            </div>

            {/* Data de criação */}
            <div className="text-sm text-muted-foreground">
              Criada em {format(new Date(message.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
            </div>

            {/* Conteúdo da mensagem */}
            <div className="bg-muted/50 p-4 rounded-lg">
              <h4 className="text-sm font-semibold mb-2">Mensagem:</h4>
              <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.message}</p>
            </div>

            {/* Extras */}
            {(message.extra_link || message.extra_image) && (
              <div className="space-y-3 border-t pt-4">
                <h4 className="text-sm font-semibold">Anexos:</h4>
                {message.extra_link && (
                  <div className="flex items-center gap-2">
                    <ExternalLink className="h-4 w-4 text-purple-600" />
                    <a
                      href={message.extra_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-purple-600 hover:underline break-all"
                    >
                      {message.extra_link}
                    </a>
                  </div>
                )}
                {message.extra_image && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Image className="h-4 w-4" />
                      Imagem anexada:
                    </div>
                    <img
                      src={message.extra_image}
                      alt="Anexo da mensagem"
                      className="max-w-full rounded-lg border"
                    />
                  </div>
                )}
              </div>
            )}

            {/* Estatísticas */}
            {message.recipients && message.recipients.total > 0 && (
              <div className="border-t pt-4">
                <h4 className="text-sm font-semibold mb-3">Status dos Destinatários:</h4>
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-yellow-50 rounded-lg p-3 text-center">
                    <div className="text-2xl font-bold text-yellow-600">{message.recipients.pendente}</div>
                    <div className="text-xs text-yellow-700">Pendente</div>
                  </div>
                  <div className="bg-blue-50 rounded-lg p-3 text-center">
                    <div className="text-2xl font-bold text-blue-600">{message.recipients.lida}</div>
                    <div className="text-xs text-blue-700">Lida</div>
                  </div>
                  <div className="bg-green-50 rounded-lg p-3 text-center">
                    <div className="text-2xl font-bold text-green-600">{message.recipients.respondida}</div>
                    <div className="text-xs text-green-700">Respondida</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog de confirmação de exclusão */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir mensagem?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. A mensagem será removida permanentemente do sistema.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                onDelete?.(message.id);
                setShowDeleteDialog(false);
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
