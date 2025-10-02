import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Edit, Trash2, Copy, RotateCcw, Mail, Calendar, Users, ExternalLink } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { InboxRecipientsModal } from "./InboxRecipientsModal";

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

  const getStatusBadgeVariant = (type: string) => {
    switch (type) {
      case 'bloqueante':
        return 'destructive';
      case 'amigavel':
        return 'default';
      default:
        return 'secondary';
    }
  };

  const getValidityText = (validUntil: string | null) => {
    if (!validUntil) return "Permanente";
    const date = new Date(validUntil);
    if (date < new Date()) return "Expirada";
    return format(date, "dd/MM/yyyy", { locale: ptBR });
  };

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
        <div className="bg-white rounded-lg border">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Mail className="h-5 w-5 mr-2" />
              Histórico de Mensagens ({messages.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {messages.map((message) => (
              <Card key={message.id} className="border-l-4" style={{
                borderLeftColor: message.type === 'bloqueante' ? '#ef4444' : '#3b82f6'
              }}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <Badge variant={getStatusBadgeVariant(message.type)}>
                          {message.type === 'bloqueante' ? 'Bloqueante' : 'Amigável'}
                        </Badge>
                        <Badge variant="outline">
                          <Calendar className="h-3 w-3 mr-1" />
                          {getValidityText(message.valid_until)}
                        </Badge>
                        {message.recipients && (
                          <Badge
                            variant="outline"
                            className="cursor-pointer hover:bg-gray-100 transition-colors"
                            onClick={() => {
                              setSelectedMessageId(message.id);
                              setSelectedMessageText(message.message);
                            }}
                          >
                            <Users className="h-3 w-3 mr-1" />
                            {message.recipients.total} destinatários
                          </Badge>
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {format(new Date(message.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      {onEdit && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onEdit(message)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      )}

                      {onDuplicate && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onDuplicate(message)}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      )}

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => reopenMutation.mutate(message.id)}
                        disabled={reopenMutation.isPending}
                      >
                        <RotateCcw className="h-4 w-4" />
                      </Button>

                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="outline" size="sm">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
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
                              onClick={() => deleteMutation.mutate(message.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Excluir
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </CardHeader>

                <CardContent>
                  <div className="space-y-3">
                    {/* Mensagem */}
                    <div className="bg-muted/50 p-3 rounded-lg">
                      <p className="text-sm">{message.message}</p>
                    </div>

                    {/* Extras */}
                    {(message.extra_link || message.extra_image) && (
                      <div className="flex items-center space-x-4">
                        {message.extra_link && (
                          <div className="flex items-center text-sm text-muted-foreground">
                            <ExternalLink className="h-4 w-4 mr-1" />
                            <a
                              href={message.extra_link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary hover:underline"
                            >
                              Link anexado
                            </a>
                          </div>
                        )}
                        {message.extra_image && (
                          <div className="text-sm text-muted-foreground">
                            📷 Imagem anexada
                          </div>
                        )}
                      </div>
                    )}

                    {/* Estatísticas dos destinatários */}
                    {message.recipients && message.recipients.total > 0 && (
                      <div className="flex items-center space-x-4 text-sm">
                        <div className="text-muted-foreground">Status:</div>
                        <div
                          className="flex space-x-3 cursor-pointer hover:opacity-70 transition-opacity"
                          onClick={() => {
                            setSelectedMessageId(message.id);
                            setSelectedMessageText(message.message);
                          }}
                        >
                          <span className="text-yellow-600 font-medium">
                            Pendente: {message.recipients.pendente}
                          </span>
                          <span className="text-blue-600 font-medium">
                            Lida: {message.recipients.lida}
                          </span>
                          <span className="text-green-600 font-medium">
                            Respondida: {message.recipients.respondida}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
              ))}
            </div>
          </CardContent>
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