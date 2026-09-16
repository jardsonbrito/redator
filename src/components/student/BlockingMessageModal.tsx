import { useState, useEffect } from "react";
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
import { useNavigate } from "react-router-dom";
import { isPerfilCompleto } from "@/utils/perfilUtils";

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
  const navigate = useNavigate();

  const isFaltaJustificativa =
    message?.acao === "justificativa_ausencia" && !!message?.aula_id;

  const isPreencherPerfil =
    message?.acao === "preencher_perfil";

  // Auto-resolve: se o perfil já está completo, marca como respondida e fecha
  useEffect(() => {
    if (!isPreencherPerfil || !isOpen || !message) return;
    const email = studentData.email || studentData.emailUsuario;
    if (!email) return;

    supabase
      .from('profiles')
      .select('avatar_url, whatsapp, data_nascimento, cidade, escola, serie, gender')
      .eq('email', email)
      .single()
      .then(({ data }) => {
        if (isPerfilCompleto(data)) {
          supabase
            .from('inbox_recipients')
            .update({ status: 'respondida', response_text: 'Perfil completado', responded_at: new Date().toISOString() })
            .eq('id', message.id)
            .then(() => {
              queryClient.invalidateQueries({ queryKey: ['student-inbox'] });
              onClose();
            });
        }
      });
  }, [isPreencherPerfil, isOpen, message?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const { data: aulaInfo } = useQuery({
    queryKey: ["aula-info-justificativa", message?.aula_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("aulas_virtuais")
        .select("titulo, data_aula, horario_inicio")
        .eq("id", message!.aula_id!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: isFaltaJustificativa,
  });

  if (!message) return null;

  // Apenas navega para a página de perfil — a mensagem só será marcada
  // como respondida quando o perfil estiver realmente completo (em EditarPerfil).
  const handlePreencherPerfil = () => {
    onClose();
    navigate("/editar-perfil");
  };

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
            {isFaltaJustificativa
              ? "Justificativa de falta"
              : isPreencherPerfil
              ? "Complete seu perfil"
              : "Mensagem Importante – Resposta Obrigatória"}
          </DialogTitle>
          {!isFaltaJustificativa && !isPreencherPerfil && (
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
        ) : isPreencherPerfil ? (
          <div className="bg-purple-50 border border-purple-200 rounded-md p-4 text-sm text-gray-700 space-y-3">
            <p className="font-medium text-purple-900">
              {message.message}
            </p>
            <p className="text-xs text-purple-700">
              Clique no botão abaixo para ser redirecionado à página de edição de perfil.
            </p>
          </div>
        ) : (
          <div className="bg-red-50 border border-red-200 rounded-md p-3 text-sm text-gray-700 whitespace-pre-wrap">
            {message.message}
          </div>
        )}

        {/* Campo de resposta - não mostrar se for preencher perfil */}
        {!isPreencherPerfil && (
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
        )}

        {/* Botão */}
        <div className="mt-4 flex justify-end">
          <Button
            onClick={isPreencherPerfil ? handlePreencherPerfil : handleRespond}
            disabled={!isPreencherPerfil && (!response.trim() || isSending)}
          >
            {isSending
              ? "Enviando..."
              : isPreencherPerfil
              ? "Ir para Editar Perfil →"
              : isFaltaJustificativa
              ? "Enviar justificativa"
              : "Enviar Resposta"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
