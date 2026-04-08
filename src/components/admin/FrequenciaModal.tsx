
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Clock, Users, Download, Bell } from "lucide-react";


interface FrequenciaAluno {
  nome: string;
  email: string;
  turma: string;
  entrada?: string;
  saida?: string;
  status: 'em_aula' | 'presente' | 'ausente';
  justificativa?: string;
  justificativaCriadoEm?: string;
}

interface FrequenciaModalProps {
  isOpen: boolean;
  onClose: () => void;
  aulaId: string;
  aulaTitle: string;
}

export const FrequenciaModal = ({ isOpen, onClose, aulaId, aulaTitle }: FrequenciaModalProps) => {
  const [frequenciaData, setFrequenciaData] = useState<FrequenciaAluno[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSendingNotif, setIsSendingNotif] = useState(false);
  const [justificativaModal, setJustificativaModal] = useState<{ texto: string; criadoEm: string; nome: string } | null>(null);
  const { user } = useAuth();

  const fetchFrequencia = async () => {
    if (!aulaId) return;

    setIsLoading(true);
    try {
      // Buscar turmas autorizadas da aula para listar todos os alunos matriculados
      const { data: aulaData } = await supabase
        .from('aulas_virtuais')
        .select('turmas_autorizadas')
        .eq('id', aulaId)
        .single();

      const turmasAutorizadas: string[] = aulaData?.turmas_autorizadas || [];

      const [presencaRes, justificativaRes, alunosMatriculadosRes] = await Promise.all([
        supabase
          .from('presenca_aulas')
          .select('*')
          .eq('aula_id', aulaId)
          .order('nome_aluno', { ascending: true }),
        supabase
          .from('justificativas_ausencia')
          .select('email_aluno, nome_aluno, turma, justificativa, criado_em')
          .eq('aula_id', aulaId),
        turmasAutorizadas.length > 0
          ? supabase
              .from('profiles')
              .select('email, nome, turma')
              .in('turma', turmasAutorizadas)
              .eq('ativo', true)
              .eq('user_type', 'aluno')
          : Promise.resolve({ data: [], error: null }),
      ]);

      if (presencaRes.error) throw presencaRes.error;

      // Mapa de justificativas por email
      const justMap = new Map<string, { texto: string; criadoEm: string; nome: string; turma: string }>();
      (justificativaRes.data || []).forEach((j: any) => {
        justMap.set(j.email_aluno, {
          texto: j.justificativa,
          criadoEm: j.criado_em,
          nome: j.nome_aluno || '',
          turma: j.turma || '',
        });
      });

      // Começar pelo cadastro completo: todos os alunos matriculados = ausente por padrão
      const alunosMap = new Map<string, FrequenciaAluno>();
      (alunosMatriculadosRes.data || []).forEach((aluno: any) => {
        const just = justMap.get(aluno.email);
        alunosMap.set(aluno.email, {
          nome: aluno.nome || aluno.email,
          email: aluno.email,
          turma: aluno.turma,
          status: 'ausente',
          justificativa: just?.texto,
          justificativaCriadoEm: just?.criadoEm,
        });
      });

      // Aplicar registros de presença sobre o mapa base
      (presencaRes.data || []).forEach((record: any) => {
        const alunoKey = record.email_aluno;
        let aluno = alunosMap.get(alunoKey);

        if (!aluno) {
          // Aluno presente que não está mais matriculado (edge case)
          const just = justMap.get(alunoKey);
          aluno = {
            nome: record.nome_aluno,
            email: record.email_aluno,
            turma: record.turma,
            status: 'ausente',
            justificativa: just?.texto,
            justificativaCriadoEm: just?.criadoEm,
          };
          alunosMap.set(alunoKey, aluno);
        }

        if (record.entrada_at) aluno.entrada = record.entrada_at;
        if (record.saida_at) aluno.saida = record.saida_at;

        if (aluno.entrada && aluno.saida) {
          aluno.status = 'presente';
        } else if (aluno.entrada && !aluno.saida) {
          aluno.status = 'em_aula';
        }
      });

      // Adicionar alunos que só justificaram e não estão no cadastro nem na presença
      justMap.forEach((just, email) => {
        if (!alunosMap.has(email)) {
          alunosMap.set(email, {
            nome: just.nome,
            email,
            turma: just.turma,
            status: 'ausente',
            justificativa: just.texto,
            justificativaCriadoEm: just.criadoEm,
          });
        }
      });

      // Ordenar: presentes primeiro, depois por nome
      const frequenciaList = Array.from(alunosMap.values()).sort((a, b) => {
        const ordem = { presente: 0, em_aula: 1, ausente: 2 };
        const diff = ordem[a.status] - ordem[b.status];
        if (diff !== 0) return diff;
        return a.nome.localeCompare(b.nome, 'pt-BR');
      });
      setFrequenciaData(frequenciaList);

    } catch (error) {
      console.error('Erro ao buscar frequência:', error);
      setFrequenciaData([]);
    } finally {
      setIsLoading(false);
    }
  };

  const exportCSV = () => {
    const csvContent = [
      'Nome,Email,Turma,Entrada,Saida,Status,Justificativa',
      ...frequenciaData.map(aluno =>
        `"${aluno.nome}","${aluno.email}","${aluno.turma}","${aluno.entrada ? new Date(aluno.entrada).toLocaleString('pt-BR') : ''}","${aluno.saida ? new Date(aluno.saida).toLocaleString('pt-BR') : ''}","${getStatusText(aluno.status)}","${aluno.justificativa ?? ''}"`
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `frequencia_${aulaTitle.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const notificarAusentes = async () => {
    const ausentes = frequenciaData.filter(
      (a) => a.status === 'ausente' && !a.justificativa
    );

    if (ausentes.length === 0) {
      toast.info('Todos os ausentes já possuem justificativa ou não há faltas a notificar.');
      return;
    }

    if (!user?.id) {
      toast.error('Usuário admin não identificado.');
      return;
    }

    setIsSendingNotif(true);
    try {
      // Verificar se já existe mensagem de notificação para esta aula
      const { data: existingMsg } = await supabase
        .from('inbox_messages')
        .select('id')
        .eq('acao', 'justificativa_ausencia')
        .eq('aula_id', aulaId)
        .maybeSingle();

      let messageId: string;

      if (existingMsg) {
        messageId = existingMsg.id;
      } else {
        const { data: newMsg, error: msgError } = await supabase
          .from('inbox_messages')
          .insert({
            message: `Você faltou à aula: "${aulaTitle}"\n\nJustifique sua ausência abaixo. Essa justificativa será registrada no sistema e ficará visível para o professor.`,
            type: 'bloqueante',
            valid_until: null,
            created_by: user.id,
            aula_id: aulaId,
            acao: 'justificativa_ausencia',
          } as any)
          .select('id')
          .single();

        if (msgError || !newMsg) throw msgError || new Error('Falha ao criar mensagem');
        messageId = newMsg.id;
      }

      // Buscar quem já é destinatário dessa mensagem
      const { data: existingRecipients } = await supabase
        .from('inbox_recipients')
        .select('student_email')
        .eq('message_id', messageId);

      const jaNotificados = new Set(
        (existingRecipients || []).map((r: any) => r.student_email)
      );

      const novosDestinatarios = ausentes.filter(
        (a) => !jaNotificados.has(a.email)
      );

      if (novosDestinatarios.length === 0) {
        toast.info('Todos os ausentes já foram notificados anteriormente.');
        setIsSendingNotif(false);
        return;
      }

      const { error: recError } = await supabase.from('inbox_recipients').insert(
        novosDestinatarios.map((a) => ({
          message_id: messageId,
          student_email: a.email,
          status: 'pendente',
        }))
      );

      if (recError) throw recError;

      toast.success(
        `${novosDestinatarios.length} aluno${novosDestinatarios.length > 1 ? 's' : ''} notificado${novosDestinatarios.length > 1 ? 's' : ''} com sucesso!`
      );
    } catch (err: any) {
      console.error('Erro ao notificar ausentes:', err);
      toast.error('Erro ao enviar notificações. Tente novamente.');
    } finally {
      setIsSendingNotif(false);
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'presente': return 'Presente';
      case 'em_aula': return 'Em aula';
      case 'ausente': return 'Ausente';
      default: return 'Ausente';
    }
  };

  const getStatusBadge = (aluno: FrequenciaAluno) => {
    switch (aluno.status) {
      case 'presente':
        return <Badge className="bg-green-100 text-green-800">✔ Presente</Badge>;
      case 'em_aula':
        return <Badge className="bg-blue-100 text-blue-800">⏰ Em aula</Badge>;
      case 'ausente':
        return aluno.justificativa
          ? <Badge className="bg-amber-100 text-amber-800">✖ Falta justificada</Badge>
          : <Badge variant="destructive">✖ Ausente</Badge>;
      default:
        return <Badge variant="destructive">✖ Ausente</Badge>;
    }
  };

  useEffect(() => {
    if (isOpen && aulaId) {
      fetchFrequencia();
    }
  }, [isOpen, aulaId]);

  return (
    <>
    <AlertDialog open={!!justificativaModal} onOpenChange={(open) => { if (!open) setJustificativaModal(null); }}>
      <AlertDialogContent className="max-w-lg">
        <AlertDialogHeader>
          <AlertDialogTitle>Justificativa de ausência</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Aluno: <span className="font-medium text-foreground">{justificativaModal?.nome}</span>
              </p>
              <div className="rounded-md border bg-muted/40 p-4 text-sm text-gray-800 whitespace-pre-wrap">
                {justificativaModal?.texto}
              </div>
              {justificativaModal?.criadoEm && (
                <p className="text-xs text-muted-foreground">
                  Enviada em {new Date(justificativaModal.criadoEm).toLocaleString('pt-BR')}
                </p>
              )}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Fechar</AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>

    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Relatório de Frequência - {aulaTitle}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <Users className="w-4 h-4" />
                {frequenciaData.length} registros
              </div>
              <div className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                Atualizado em {new Date().toLocaleString('pt-BR')}
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Button
                onClick={notificarAusentes}
                variant="outline"
                size="sm"
                disabled={isSendingNotif || frequenciaData.filter(a => a.status === 'ausente' && !a.justificativa).length === 0}
              >
                <Bell className="w-4 h-4 mr-2" />
                {isSendingNotif ? 'Notificando...' : 'Notificar ausentes'}
              </Button>
              <Button onClick={exportCSV} variant="outline" size="sm">
                <Download className="w-4 h-4 mr-2" />
                Exportar CSV
              </Button>
            </div>
          </div>

          {isLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="text-sm text-muted-foreground mt-2">Carregando frequência...</p>
            </div>
          ) : frequenciaData.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="w-8 h-8 mx-auto mb-2" />
              <p>Nenhum registro de frequência encontrado para esta aula</p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome do Aluno</TableHead>
                    <TableHead>Turma</TableHead>
                    <TableHead>Entrada</TableHead>
                    <TableHead>Saída</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Justificativa</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {frequenciaData.map((aluno, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">
                        <div>
                          <div>{aluno.nome}</div>
                          <div className="text-xs text-muted-foreground">{aluno.email}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{aluno.turma}</Badge>
                      </TableCell>
                      <TableCell>
                        {aluno.entrada ? (
                          <div className="text-sm">
                            {new Date(aluno.entrada).toLocaleString('pt-BR')}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {aluno.saida ? (
                          <div className="text-sm">
                            {new Date(aluno.saida).toLocaleString('pt-BR')}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(aluno)}
                      </TableCell>
                      <TableCell className="max-w-[180px]">
                        {aluno.justificativa ? (
                          <button
                            className="text-sm text-left text-blue-700 hover:underline truncate max-w-[160px] block"
                            title="Clique para ver a justificativa completa"
                            onClick={() => setJustificativaModal({
                              texto: aluno.justificativa!,
                              criadoEm: aluno.justificativaCriadoEm!,
                              nome: aluno.nome,
                            })}
                          >
                            {aluno.justificativa.length > 45
                              ? aluno.justificativa.slice(0, 45) + '…'
                              : aluno.justificativa}
                          </button>
                        ) : (
                          <span className="text-muted-foreground text-sm">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
    </>
  );
};
