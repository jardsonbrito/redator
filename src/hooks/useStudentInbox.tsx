import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useStudentAuth } from "@/hooks/useStudentAuth";
import { toast } from "sonner";

export interface StudentInboxMessage {
  id: string;
  message_id: string;
  message: string;
  type: "bloqueante" | "amigavel";
  valid_until: string | null;
  extra_link: string | null;
  extra_image: string | null;
  created_at: string;
  status: "pendente" | "lida" | "respondida";
  response_text: string | null;
  responded_at: string | null;
}

export function useStudentInbox() {
  const { user, studentData } = useStudentAuth();
  const queryClient = useQueryClient();
  const [hasBlockingMessage, setHasBlockingMessage] = useState(false);

  // Usar studentData.email como fonte principal
  const emailToUse = studentData?.email || user?.email;


  // Buscar mensagens do aluno
  const { data: messages = [], isLoading, error } = useQuery({
    queryKey: ['student-inbox', emailToUse],
    queryFn: async () => {

      try {
        // Buscar recipients e mensagens em uma query
        const { data, error } = await supabase
          .from('inbox_recipients')
          .select(`
            id,
            message_id,
            status,
            response_text,
            responded_at,
            inbox_messages (
              message,
              type,
              valid_until,
              extra_link,
              extra_image,
              created_at
            )
          `)
          .eq('student_email', emailToUse)
          .order('created_at', {
            referencedTable: 'inbox_messages',
            ascending: false
          });

        if (error) {
          console.error('Erro ao buscar mensagens:', error);
          throw error;
        }

        if (!data || data.length === 0) {
          return [];
        }

        // Filtrar mensagens válidas (não expiradas)
        const now = new Date();
        const validMessages = data
          .filter((item) => {
            const message = item.inbox_messages;
            if (!message) return false;
            if (!message.valid_until) return true; // Permanente
            return new Date(message.valid_until) > now; // Não expirada
          })
          .map((item) => ({
            id: item.id,
            message_id: item.message_id,
            message: item.inbox_messages.message,
            type: item.inbox_messages.type,
            valid_until: item.inbox_messages.valid_until,
            extra_link: item.inbox_messages.extra_link,
            extra_image: item.inbox_messages.extra_image,
            created_at: item.inbox_messages.created_at,
            status: item.status,
            response_text: item.response_text,
            responded_at: item.responded_at,
          })) as StudentInboxMessage[];

        return validMessages;

      } catch (err) {
        console.error('Erro na query do inbox:', err);
        throw err;
      }
    },
    enabled: !!emailToUse, // Habilitar quando tiver email válido
    staleTime: 30 * 1000, // 30 segundos
    refetchInterval: 60 * 1000, // Recarregar a cada minuto
  });


  // Contar mensagens não lidas
  const unreadCount = messages.filter(msg => msg.status === 'pendente').length;

  // Verificar se há mensagem bloqueante não respondida
  const blockingMessage = messages.find(
    msg => msg.type === 'bloqueante' && msg.status === 'pendente'
  );

  // Marcar mensagem como lida
  const markAsReadMutation = useMutation({
    mutationFn: async (recipientId: string) => {
      const { error } = await supabase
        .from('inbox_recipients')
        .update({
          status: 'lida',
          responded_at: new Date().toISOString()
        })
        .eq('id', recipientId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['student-inbox'] });
    },
    onError: (error) => {
      console.error('Erro ao marcar mensagem como lida:', error);
      toast.error("Erro ao marcar mensagem como lida");
    },
  });

  // Responder mensagem
  const respondMessageMutation = useMutation({
    mutationFn: async ({ recipientId, responseText }: { recipientId: string; responseText: string }) => {
      const { error } = await supabase
        .from('inbox_recipients')
        .update({
          status: 'respondida',
          response_text: responseText.trim(),
          responded_at: new Date().toISOString()
        })
        .eq('id', recipientId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['student-inbox'] });
      toast.success("Resposta enviada com sucesso!");
    },
    onError: (error) => {
      console.error('Erro ao enviar resposta:', error);
      toast.error("Erro ao enviar resposta");
    },
  });

  // Atualizar estado de mensagem bloqueante
  useEffect(() => {
    setHasBlockingMessage(!!blockingMessage);
  }, [blockingMessage]);

  return {
    messages,
    unreadCount,
    blockingMessage,
    hasBlockingMessage,
    isLoading,
    error,
    markAsRead: markAsReadMutation.mutate,
    markAsReadLoading: markAsReadMutation.isPending,
    respondMessage: respondMessageMutation.mutate,
    respondMessageLoading: respondMessageMutation.isPending,
  };
}