import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useQuery, useQueryClient } from "@tanstack/react-query";
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

  const { data: aulaInfo } = useQuery({
    queryKey: ["aula-info-justificativa", message.aula_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("aulas")
        .select("titulo, data_aula, horario_inicio")
        .eq("id", message.aula_id!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: isFaltaJustificativa,
  });

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

  const aulaDataFormatada = aulaInfo?.data_aula
    ? format(parseISO(aulaInfo.data_aula), "dd/MM/yyyy", { locale: ptBR })
    : null;

  const aulaHorario = aulaInfo?.horario_inicio
    ? aulaInfo.horario_inicio.substring(0, 5).replace(":00", "h").replace(/:(\d+)/, "h$1")
    : null;

  return (
    <Dialog open={isOpen} onOpenChange={() => {}} modal>
      <DialogContent
        className="max-w-lg [&>button]:hidden"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>
            {isFaltaJustificativa ? "Justificativa de falta" : "Mensagem Importante – Resposta Obrigatória"}
          </DialogTitle>
          {!isFaltaJustificativa && (
            <p className="text-sm text-gray-500">
              {format(new Date(message.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
            </p>
          )}
        </DialogHeader>

        {isFaltaJustificativa ? (
          <div className="rounded-md bg-blue-50 border border-blue-200 px-4 py-3 text-sm text-blue-900 space-y-1">
            {aulaInfo?.titulo && <p>Aula: {aulaInfo.titulo}</p>}
            {aulaDataFormatada && <p>Data da aula: {aulaDataFormatada}</p>}
            {aulaHorario && <p>Horário: {aulaHorario}</p>}
          </div>
        ) : (
          <div className="bg-red-50 border border-red-200 rounded-md p-3 text-sm text-gray-700 whitespace-pre-wrap">
            {message.message}
          </div>
        )}

        {/* Campo de resposta */}
        <div className="mt-2">
          {!isFaltaJustificativa && (
            <label className="text-sm font-medium">Sua resposta:</label>
          )}
          <Textarea
            value={response}
            onChange={(e) => setResponse(e.target.value)}
            placeholder={
              isFaltaJustificativa
                ? "Descreva de forma objetiva o motivo pelo qual você não pôde participar da aula."
                : "Digite sua resposta..."
            }
            className={isFaltaJustificativa ? undefined : "mt-2"}
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
              ? "Enviar justificativa"
              : "Enviar Resposta"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
