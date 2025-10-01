import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
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
  const [response, setResponse] = useState("");
  const { respondMessage, respondMessageLoading } = useStudentInbox();

  if (!message) return null;

  const handleRespond = () => {
    const responseText = response.trim();
    if (!responseText) {
      toast.error("Por favor, digite uma resposta");
      return;
    }

    respondMessage({
      recipientId: message.id,
      responseText
    });

    // Limpar campo e fechar modal após resposta
    setResponse("");
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={() => {}} modal>
      <DialogContent
        className="max-w-lg [&>button]:hidden"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="text-red-600">
            Mensagem Importante – Resposta Obrigatória
          </DialogTitle>
          <p className="text-sm text-gray-500">
            {format(new Date(message.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
          </p>
        </DialogHeader>

        {/* Corpo da mensagem */}
        <div className="bg-red-50 border border-red-200 rounded-md p-3 text-sm text-gray-700">
          {message.message}
        </div>

        {/* Campo de resposta */}
        <div className="mt-4">
          <label className="text-sm font-medium">Sua resposta:</label>
          <Textarea
            value={response}
            onChange={(e) => setResponse(e.target.value)}
            placeholder="Digite sua resposta..."
            className="mt-2"
            rows={4}
          />
        </div>

        {/* Botão */}
        <div className="mt-4 flex justify-end">
          <Button
            onClick={handleRespond}
            disabled={!response.trim() || respondMessageLoading}
          >
            {respondMessageLoading ? "Enviando..." : "Enviar Resposta"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}