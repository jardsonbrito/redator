import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Mail, Clock, CheckCircle, MessageSquare, ExternalLink, Image } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useStudentInbox, type StudentInboxMessage } from "@/hooks/useStudentInbox";
import { toast } from "sonner";

interface StudentInboxModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function StudentInboxModal({ isOpen, onClose }: StudentInboxModalProps) {
  const {
    messages,
    markAsRead,
    markAsReadLoading,
    respondMessage,
    respondMessageLoading
  } = useStudentInbox();

  const [responseText, setResponseText] = useState<Record<string, string>>({});

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pendente':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'lida':
        return <CheckCircle className="h-4 w-4 text-blue-500" />;
      case 'respondida':
        return <MessageSquare className="h-4 w-4 text-green-500" />;
      default:
        return <Mail className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pendente':
        return 'Não lida';
      case 'lida':
        return 'Lida';
      case 'respondida':
        return 'Respondida';
      default:
        return status;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pendente':
        return 'bg-yellow-100 text-yellow-800';
      case 'lida':
        return 'bg-blue-100 text-blue-800';
      case 'respondida':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'bloqueante':
        return 'bg-red-100 text-red-800';
      case 'amigavel':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const handleMarkAsRead = (recipientId: string) => {
    markAsRead(recipientId);
  };

  const handleRespond = (message: StudentInboxMessage) => {
    const response = responseText[message.id]?.trim();
    if (!response) {
      toast.error("Por favor, digite uma resposta");
      return;
    }

    respondMessage({
      recipientId: message.id,
      responseText: response
    });

    // Limpar campo de resposta
    setResponseText(prev => ({ ...prev, [message.id]: '' }));
  };

  const handleResponseChange = (messageId: string, value: string) => {
    setResponseText(prev => ({ ...prev, [messageId]: value }));
  };

  if (messages.length === 0) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Inbox - Mensagens
            </DialogTitle>
          </DialogHeader>

          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Mail className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Nenhuma mensagem</h3>
            <p className="text-muted-foreground">
              Você não possui mensagens no momento.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Inbox - Mensagens ({messages.length})
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="h-[600px] pr-4">
          <div className="space-y-6">
            {messages.map((message) => (
              <div key={message.id} className="border rounded-lg p-4 space-y-4">
                {/* Header da mensagem */}
                <div className="flex items-start justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Badge className={getTypeColor(message.type)}>
                        {message.type === 'bloqueante' ? 'Bloqueante' : 'Amigável'}
                      </Badge>
                      <Badge variant="outline" className={getStatusColor(message.status)}>
                        <div className="flex items-center gap-1">
                          {getStatusIcon(message.status)}
                          {getStatusText(message.status)}
                        </div>
                      </Badge>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {format(new Date(message.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                    </div>
                  </div>

                  {/* Botão marcar como lida (só para mensagens pendentes e amigáveis) */}
                  {message.status === 'pendente' && message.type === 'amigavel' && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleMarkAsRead(message.id)}
                      disabled={markAsReadLoading}
                    >
                      <CheckCircle className="h-4 w-4 mr-1" />
                      Marcar como lida
                    </Button>
                  )}
                </div>

                {/* Conteúdo da mensagem */}
                <div className="bg-muted/50 p-4 rounded-lg">
                  <p className="text-sm leading-relaxed">{message.message}</p>
                </div>

                {/* Extras */}
                {(message.extra_link || message.extra_image) && (
                  <div className="flex items-center gap-4 text-sm">
                    {message.extra_link && (
                      <a
                        href={message.extra_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-primary hover:underline"
                      >
                        <ExternalLink className="h-4 w-4" />
                        Link anexado
                      </a>
                    )}
                    {message.extra_image && (
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Image className="h-4 w-4" />
                        <img
                          src={message.extra_image}
                          alt="Imagem anexada"
                          className="max-w-32 max-h-20 rounded object-cover"
                        />
                      </div>
                    )}
                  </div>
                )}

                {/* Campo de resposta (para mensagens bloqueantes pendentes) */}
                {message.type === 'bloqueante' && message.status === 'pendente' && (
                  <div className="space-y-3 border-t pt-4">
                    <Label htmlFor={`response-${message.id}`}>
                      Resposta obrigatória *
                    </Label>
                    <Textarea
                      id={`response-${message.id}`}
                      placeholder="Digite sua resposta..."
                      value={responseText[message.id] || ''}
                      onChange={(e) => handleResponseChange(message.id, e.target.value)}
                      rows={3}
                    />
                    <Button
                      onClick={() => handleRespond(message)}
                      disabled={!responseText[message.id]?.trim() || respondMessageLoading}
                      className="w-full"
                    >
                      {respondMessageLoading ? "Enviando..." : "Enviar Resposta"}
                    </Button>
                  </div>
                )}

                {/* Exibir resposta enviada */}
                {message.status === 'respondida' && message.response_text && (
                  <div className="space-y-2 border-t pt-4">
                    <Label>Sua resposta:</Label>
                    <div className="bg-green-50 border border-green-200 p-3 rounded-lg">
                      <p className="text-sm">{message.response_text}</p>
                      <div className="text-xs text-muted-foreground mt-2">
                        Respondido em {format(new Date(message.responded_at!), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                      </div>
                    </div>
                  </div>
                )}

                {message !== messages[messages.length - 1] && <Separator />}
              </div>
            ))}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}