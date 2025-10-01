import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, ExternalLink, Image } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useStudentInbox, type StudentInboxMessage } from "@/hooks/useStudentInbox";
import { toast } from "sonner";

interface BlockingMessageModalProps {
  message: StudentInboxMessage | null;
  isOpen: boolean;
  onClose: () => void;
}

export function BlockingMessageModal({ message, isOpen, onClose }: BlockingMessageModalProps) {
  const [responseText, setResponseText] = useState("");
  const { respondMessage, respondMessageLoading } = useStudentInbox();

  if (!message) return null;

  const handleRespond = () => {
    const response = responseText.trim();
    if (!response) {
      toast.error("Por favor, digite uma resposta");
      return;
    }

    respondMessage({
      recipientId: message.id,
      responseText: response
    });

    // Limpar campo e fechar modal após resposta
    setResponseText("");
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={() => {}} modal>
      <DialogContent
        className="max-w-2xl"
        hideCloseButton
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="h-5 w-5" />
            Mensagem Importante - Resposta Obrigatória
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Informações da mensagem */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Badge variant="destructive">
                Bloqueante
              </Badge>
              <div className="text-sm text-muted-foreground">
                {format(new Date(message.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
              </div>
            </div>

            <div className="bg-red-50 border border-red-200 p-4 rounded-lg">
              <p className="text-sm leading-relaxed text-red-900">
                {message.message}
              </p>
            </div>
          </div>

          {/* Extras */}
          {(message.extra_link || message.extra_image) && (
            <div className="space-y-3">
              {message.extra_link && (
                <div>
                  <Label className="text-sm font-medium">Link anexado:</Label>
                  <div className="mt-1">
                    <a
                      href={message.extra_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-primary hover:underline"
                    >
                      <ExternalLink className="h-4 w-4" />
                      Abrir link
                    </a>
                  </div>
                </div>
              )}

              {message.extra_image && (
                <div>
                  <Label className="text-sm font-medium">Imagem anexada:</Label>
                  <div className="mt-2">
                    <img
                      src={message.extra_image}
                      alt="Imagem anexada"
                      className="max-w-full max-h-48 rounded object-cover border"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Campo de resposta obrigatório */}
          <div className="space-y-3">
            <Label htmlFor="blocking-response" className="text-sm font-medium">
              Sua resposta * (obrigatória para continuar)
            </Label>
            <Textarea
              id="blocking-response"
              placeholder="Digite sua resposta para esta mensagem..."
              value={responseText}
              onChange={(e) => setResponseText(e.target.value)}
              rows={4}
              className="resize-none"
            />
          </div>

          {/* Aviso */}
          <div className="bg-yellow-50 border border-yellow-200 p-3 rounded-lg">
            <p className="text-sm text-yellow-800">
              <strong>Atenção:</strong> Você precisa responder a esta mensagem para continuar usando a plataforma.
            </p>
          </div>

          {/* Botão de resposta */}
          <div className="flex justify-end">
            <Button
              onClick={handleRespond}
              disabled={!responseText.trim() || respondMessageLoading}
              className="min-w-32"
            >
              {respondMessageLoading ? "Enviando..." : "Enviar Resposta"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}