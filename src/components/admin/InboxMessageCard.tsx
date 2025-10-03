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
import { MoreVertical, Trash2, Copy, RotateCcw, Users, Calendar, ExternalLink, Image } from "lucide-react";

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
  onDuplicate?: (message: InboxMessage) => void;
  onDelete?: (messageId: string) => void;
  onReopen?: (messageId: string) => void;
  onViewRecipients?: (messageId: string, messageText: string) => void;
  isDeleting?: boolean;
  isReopening?: boolean;
}

export function InboxMessageCard({
  message,
  onDuplicate,
  onDelete,
  onReopen,
  onViewRecipients,
  isDeleting = false,
  isReopening = false,
}: InboxMessageCardProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

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
