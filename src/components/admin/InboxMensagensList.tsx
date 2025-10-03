import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Mail } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { InboxRecipientsModal } from "./InboxRecipientsModal";
import { InboxMessageCard } from "./InboxMessageCard";

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

interface InboxMensagensListProps {
  onEdit?: (message: InboxMessage) => void;
  onDuplicate?: (message: InboxMessage) => void;
}

export function InboxMensagensList({ onEdit, onDuplicate }: InboxMensagensListProps) {
  const queryClient = useQueryClient();
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(null);
  const [selectedMessageText, setSelectedMessageText] = useState<string>("");

  // Buscar mensagens
  const { data: messages = [], isLoading, error } = useQuery({
    queryKey: ['inbox-messages'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('inbox_messages')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Erro ao buscar mensagens:', error);
        throw error;
      }

      // Para cada mensagem, buscar estatísticas dos destinatários
      const messagesWithStats = await Promise.all(
        (data || []).map(async (message) => {
          const { data: recipients, error: recipientsError } = await supabase
            .from('inbox_recipients')
            .select('status')
            .eq('message_id', message.id);

          if (recipientsError) {
            console.error('Erro ao buscar destinatários:', recipientsError);
            return {
              ...message,
              recipients: { total: 0, pendente: 0, lida: 0, respondida: 0 }
            };
          }

          const stats = (recipients || []).reduce((acc, r) => {
            acc.total++;
            acc[r.status as keyof typeof acc]++;
            return acc;
          }, { total: 0, pendente: 0, lida: 0, respondida: 0 });

          return {
            ...message,
            recipients: stats
          };
        })
      );

      return messagesWithStats;
    },
    staleTime: 2 * 60 * 1000,
  });

  // Deletar mensagem
  const deleteMutation = useMutation({
    mutationFn: async (messageId: string) => {
      const { error } = await supabase
        .from('inbox_messages')
        .delete()
        .eq('id', messageId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inbox-messages'] });
      queryClient.invalidateQueries({ queryKey: ['admin-dashboard-cards'] });
      toast.success("Mensagem excluída com sucesso!");
    },
    onError: (error) => {
      console.error('Erro ao excluir mensagem:', error);
      toast.error("Erro ao excluir mensagem");
    },
  });

  // Reabrir mensagem (resetar status dos destinatários)
  const reopenMutation = useMutation({
    mutationFn: async (messageId: string) => {
      const { error } = await supabase
        .from('inbox_recipients')
        .update({
          status: 'pendente',
          response_text: null,
          responded_at: null
        })
        .eq('message_id', messageId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inbox-messages'] });
      toast.success("Mensagem reaberta! Todos os destinatários voltaram ao status pendente.");
    },
    onError: (error) => {
      console.error('Erro ao reabrir mensagem:', error);
      toast.error("Erro ao reabrir mensagem");
    },
  });


  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-muted-foreground">Carregando mensagens...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-destructive">Erro ao carregar mensagens</div>
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div className="text-center p-8">
        <Mail className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold mb-2">Nenhuma mensagem encontrada</h3>
        <p className="text-muted-foreground">
          Crie sua primeira mensagem usando as abas "Básico", "Configuração" e "Destinatários"
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6">
        {/* Título */}
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900 flex items-center">
            <Mail className="h-6 w-6 mr-2" />
            Histórico de Mensagens
            <span className="ml-2 text-sm font-normal text-gray-500">
              ({messages.length} {messages.length === 1 ? 'mensagem' : 'mensagens'})
            </span>
          </h2>
        </div>

        {/* Grid de Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
          {messages.map((message) => (
            <InboxMessageCard
              key={message.id}
              message={message}
              onDuplicate={onDuplicate}
              onDelete={(messageId) => deleteMutation.mutate(messageId)}
              onReopen={(messageId) => reopenMutation.mutate(messageId)}
              onViewRecipients={(messageId, messageText) => {
                setSelectedMessageId(messageId);
                setSelectedMessageText(messageText);
              }}
              isDeleting={deleteMutation.isPending}
              isReopening={reopenMutation.isPending}
            />
          ))}
        </div>
      </div>

      {/* Modal de destinatários */}
      <InboxRecipientsModal
        isOpen={selectedMessageId !== null}
        onClose={() => {
          setSelectedMessageId(null);
          setSelectedMessageText("");
        }}
        messageId={selectedMessageId || ""}
        messageText={selectedMessageText}
      />
    </>
  );
}