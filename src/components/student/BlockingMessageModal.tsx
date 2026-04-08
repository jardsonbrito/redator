import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useStudentAuth } from "@/hooks/useStudentAuth";
import { type StudentInboxMessage } from "@/hooks/useStudentInbox";
import { toast } from "sonner";

interface BlockingMessageModalProps {
  message: StudentInboxMessage | null;
  isOpen: boolean;
  onClose: () => void;
}

export function BlockingMessageModal({ message, isOpen, onClose }: BlockingMessageModalProps) {
  const [response, setResponse] = useState("");
  const [isSending, setIsSending] = useState(false);
  const { studentData } = useStudentAuth();
  const queryClient = useQueryClient();

  if (!message) return null;

  const isFaltaJustificativa =
    message.acao === "justificativa_ausencia" && !!message.aula_id;

  const handleRespond = async () => {
    const responseText = response.trim();
    if (!responseText) {
      toast.error("Por favor, digite uma resposta");
      return;
    }

    setIsSending(true);
    try {
      // 1. Salva no inbox
      const { error: inboxError } = await supabase
        .from("inbox_recipients")
        .update({
          status: "respondida",
          response_text: responseText,
          responded_at: new Date().toISOString(),
        })
        .eq("id", message.id);

      if (inboxError) throw inboxError;

      // 2. Se for justificativa de falta, salva também em justificativas_ausencia
      if (isFaltaJustificativa && studentData.email) {
        const { error: justError } = await supabase
          .from("justificativas_ausencia")
          .upsert(
            {
              aula_id: message.aula_id,
              email_aluno: studentData.email.toLowerCase(),
              nome_aluno: studentData.nomeUsuario || "",
              turma: studentData.turma || "",
              aluno_id: studentData.id || null,
              justificativa: responseText,
            },
            { onConflict: "aula_id,email_aluno" }
          );

        if (justError) {
          console.error("Erro ao salvar justificativa:", justError);
          // Não aborta — o inbox já foi salvo
        }
      }

      queryClient.invalidateQueries({ queryKey: ["student-inbox"] });
      toast.success("Resposta enviada com sucesso!");
      setResponse("");
      onClose();
    } catch (err: any) {
      console.error("Erro ao enviar resposta:", err);
      toast.error("Erro ao enviar resposta. Tente novamente.");
    } finally {
      setIsSending(false);
    }
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
            {isFaltaJustificativa
              ? "Justificativa de Falta – Resposta Obrigatória"
              : "Mensagem Importante – Resposta Obrigatória"}
          </DialogTitle>
          <p className="text-sm text-gray-500">
            {format(new Date(message.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
          </p>
        </DialogHeader>

        {/* Corpo da mensagem */}
        <div className="bg-red-50 border border-red-200 rounded-md p-3 text-sm text-gray-700 whitespace-pre-wrap">
          {message.message}
        </div>

        {isFaltaJustificativa && (
          <div className="rounded-md bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800">
            A ausência permanece registrada. A justificativa será enviada ao professor e ficará visível no seu histórico.
          </div>
        )}

        {/* Campo de resposta */}
        <div className="mt-2">
          <label className="text-sm font-medium">
            {isFaltaJustificativa ? "Motivo da ausência:" : "Sua resposta:"}
          </label>
          <Textarea
            value={response}
            onChange={(e) => setResponse(e.target.value)}
            placeholder={
              isFaltaJustificativa
                ? "Descreva o motivo pelo qual não pôde participar da aula..."
                : "Digite sua resposta..."
            }
            className="mt-2"
            rows={4}
            maxLength={500}
            disabled={isSending}
          />
          {isFaltaJustificativa && (
            <p className="text-xs text-muted-foreground text-right mt-1">{response.length}/500</p>
          )}
        </div>

        {/* Botão */}
        <div className="mt-4 flex justify-end">
          <Button
            onClick={handleRespond}
            disabled={!response.trim() || isSending}
          >
            {isSending
              ? "Enviando..."
              : isFaltaJustificativa
              ? "Enviar Justificativa"
              : "Enviar Resposta"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
