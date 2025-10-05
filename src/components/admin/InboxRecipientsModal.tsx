import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, CheckCircle2, Clock, MessageSquare, ChevronDown, ChevronUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface RecipientData {
  student_email: string;
  student_name: string;
  turma: string | null;
  status: 'pendente' | 'lida' | 'respondida';
  response_text: string | null;
  responded_at: string | null;
}

interface InboxRecipientsModalProps {
  isOpen: boolean;
  onClose: () => void;
  messageId: string;
  messageText: string;
}

// Componente para resposta expansível
const ExpandableResponse = ({ text, timestamp }: { text: string; timestamp: string | null }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const MAX_LENGTH = 150;
  const shouldTruncate = text.length > MAX_LENGTH;

  return (
    <div className="text-sm space-y-2">
      <div className={`text-gray-700 whitespace-pre-wrap ${!isExpanded && shouldTruncate ? 'max-h-20 overflow-hidden' : 'max-h-[60vh] overflow-y-auto'} rounded-lg bg-gray-50 p-3`}>
        {!isExpanded && shouldTruncate ? text.slice(0, MAX_LENGTH) + '...' : text}
      </div>

      {shouldTruncate && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-primary hover:text-primary/80 p-0 h-auto font-medium flex items-center gap-1"
        >
          {isExpanded ? (
            <>
              <ChevronUp className="w-4 h-4" />
              Mostrar menos
            </>
          ) : (
            <>
              <ChevronDown className="w-4 h-4" />
              Ler tudo
            </>
          )}
        </Button>
      )}

      {timestamp && (
        <div className="text-xs text-gray-500">
          {new Date(timestamp).toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          })}
        </div>
      )}
    </div>
  );
};

export const InboxRecipientsModal = ({
  isOpen,
  onClose,
  messageId,
  messageText,
}: InboxRecipientsModalProps) => {
  const [recipients, setRecipients] = useState<RecipientData[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen && messageId) {
      fetchRecipients();
    }
  }, [isOpen, messageId]);

  const fetchRecipients = async () => {
    try {
      setIsLoading(true);

      console.log('🔍 Buscando destinatários para message_id:', messageId);

      // Buscar recipients da tabela inbox_recipients
      const { data: recipientsData, error: recipientsError } = await supabase
        .from("inbox_recipients")
        .select("student_email, status, response_text, responded_at")
        .eq("message_id", messageId);

      console.log('📊 Recipients raw:', recipientsData?.length);
      console.log('❌ Erro recipients:', recipientsError);

      if (recipientsError) throw recipientsError;

      // Buscar informações dos alunos da tabela profiles
      if (recipientsData && recipientsData.length > 0) {
        const emails = recipientsData.map(r => r.student_email);

        const { data: profilesData, error: profilesError } = await supabase
          .from("profiles")
          .select("email, nome, turma")
          .in("email", emails);

        console.log('📊 Profiles encontrados:', profilesData?.length);
        console.log('❌ Erro profiles:', profilesError);

        if (profilesError) throw profilesError;

        // Mapear profiles por email
        const profilesMap = new Map(profilesData?.map(p => [p.email, p]) || []);

        // Combinar dados
        const combined = recipientsData.map(r => {
          const profile = profilesMap.get(r.student_email);
          return {
            student_email: r.student_email,
            student_name: profile?.nome || r.student_email,
            turma: profile?.turma || null,
            status: r.status as 'pendente' | 'lida' | 'respondida',
            response_text: r.response_text,
            responded_at: r.responded_at
          };
        });

        // Ordenar por nome
        combined.sort((a, b) => a.student_name.localeCompare(b.student_name));

        setRecipients(combined);
      } else {
        setRecipients([]);
      }
    } catch (error) {
      console.error("Erro ao buscar destinatários:", error);
      setRecipients([]);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pendente':
        return (
          <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
            <Clock className="h-3 w-3 mr-1" />
            Pendente
          </Badge>
        );
      case 'lida':
        return (
          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Lida
          </Badge>
        );
      case 'respondida':
        return (
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
            <MessageSquare className="h-3 w-3 mr-1" />
            Respondida
          </Badge>
        );
      default:
        return <Badge variant="secondary">-</Badge>;
    }
  };

  const stats = recipients.reduce(
    (acc, r) => {
      acc.total++;
      acc[r.status]++;
      return acc;
    },
    { total: 0, pendente: 0, lida: 0, respondida: 0 }
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">
            Destinatários da Mensagem
          </DialogTitle>
        </DialogHeader>

        {/* Resumo de estatísticas */}
        <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg mb-4">
          <div className="text-sm">
            <span className="font-semibold">{stats.total}</span> destinatários
          </div>
          <div className="h-4 w-px bg-border" />
          <div className="flex gap-4 text-sm">
            <span className="text-yellow-700">
              <Clock className="h-4 w-4 inline mr-1" />
              {stats.pendente} pendente{stats.pendente !== 1 ? 's' : ''}
            </span>
            <span className="text-blue-700">
              <CheckCircle2 className="h-4 w-4 inline mr-1" />
              {stats.lida} lida{stats.lida !== 1 ? 's' : ''}
            </span>
            <span className="text-green-700">
              <MessageSquare className="h-4 w-4 inline mr-1" />
              {stats.respondida} respondida{stats.respondida !== 1 ? 's' : ''}
            </span>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
          </div>
        ) : recipients.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            Nenhum destinatário encontrado para esta mensagem.
          </div>
        ) : (
          <div className="rounded-lg border border-gray-200">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <TableHead className="w-16 text-center font-semibold">#</TableHead>
                  <TableHead className="font-semibold">Nome do Aluno</TableHead>
                  <TableHead className="font-semibold">Turma</TableHead>
                  <TableHead className="font-semibold text-center">Status</TableHead>
                  <TableHead className="font-semibold">Resposta</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recipients.map((recipient, index) => (
                  <TableRow key={index} className="hover:bg-gray-50">
                    <TableCell className="text-center text-gray-600 font-medium">
                      {index + 1}
                    </TableCell>
                    <TableCell className="font-medium text-gray-900">
                      {recipient.student_name}
                    </TableCell>
                    <TableCell className="text-gray-700">
                      {recipient.turma || "Sem turma"}
                    </TableCell>
                    <TableCell className="text-center">
                      {getStatusBadge(recipient.status)}
                    </TableCell>
                    <TableCell className="max-w-md">
                      {recipient.response_text ? (
                        <ExpandableResponse
                          text={recipient.response_text}
                          timestamp={recipient.responded_at}
                        />
                      ) : (
                        <span className="text-gray-400 text-sm">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {!isLoading && recipients.length > 0 && (
          <div className="mt-4 text-sm text-gray-600 text-right">
            Total: {recipients.length} {recipients.length === 1 ? 'destinatário' : 'destinatários'}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
