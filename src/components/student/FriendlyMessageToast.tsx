import { useState } from "react";
import { X, Check, ExternalLink, Image } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useStudentInbox, type StudentInboxMessage } from "@/hooks/useStudentInbox";

interface FriendlyMessageToastProps {
  message: StudentInboxMessage;
  onDismiss: () => void;
}

export function FriendlyMessageToast({ message, onDismiss }: FriendlyMessageToastProps) {
  const [isVisible, setIsVisible] = useState(true);
  const { markAsRead, markAsReadLoading } = useStudentInbox();

  const handleMarkAsRead = () => {
    markAsRead(message.id);
    handleDismiss();
  };

  const handleDismiss = () => {
    setIsVisible(false);
    setTimeout(onDismiss, 300); // Aguardar animação
  };

  if (!isVisible) return null;

  return (
    <div className="w-96 animate-in slide-in-from-right-full duration-300">
      <Card className="border-l-4 border-l-blue-500 shadow-lg">
        <CardContent className="p-4">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2">
              <Badge className="bg-blue-100 text-blue-800">
                Mensagem
              </Badge>
              <div className="text-xs text-muted-foreground">
                {format(new Date(message.created_at), "dd/MM HH:mm", { locale: ptBR })}
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDismiss}
              className="h-6 w-6 p-0 hover:bg-gray-100"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="space-y-3">
            {/* Conteúdo da mensagem */}
            <div className="text-sm leading-relaxed whitespace-pre-wrap">
              {message.message}
            </div>

            {/* Extras */}
            {(message.extra_link || message.extra_image) && (
              <div className="space-y-2">
                {message.extra_link && (
                  <a
                    href={message.extra_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-xs text-primary hover:underline"
                  >
                    <ExternalLink className="h-3 w-3" />
                    Ver link
                  </a>
                )}

                {message.extra_image && (
                  <div className="flex items-center gap-2">
                    <Image className="h-3 w-3 text-muted-foreground" />
                    <img
                      src={message.extra_image}
                      alt="Imagem anexada"
                      className="max-w-20 max-h-16 rounded object-cover"
                    />
                  </div>
                )}
              </div>
            )}

            {/* Botão marcar como lida */}
            <div className="flex justify-end pt-2">
              <Button
                size="sm"
                variant="outline"
                onClick={handleMarkAsRead}
                disabled={markAsReadLoading}
                className="text-xs"
              >
                <Check className="h-3 w-3 mr-1" />
                {markAsReadLoading ? "Marcando..." : "Marcar como lida"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}