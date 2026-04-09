
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
  const [aulaInfo, setAulaInfo] = useState<{ data_aula: string; horario_fim: string } | null>(null);
  const { user } = useAuth();

  const fetchFrequencia = async () => {
    if (!aulaId) return;

    setIsLoading(true);
    try {
      // Buscar dados da aula para listar turmas e calcular se encerrou há mais de 24h
      const { data: aulaData } = await supabase
        .from('aulas_virtuais')
        .select('turmas_autorizadas, data_aula, horario_fim')
        .eq('id', aulaId)
        .single();

      const turmasAutorizadas: string[] = aulaData?.turmas_autorizadas || [];

      // Guardar info para uso no agendamento de follow-ups
      if (aulaData?.data_aula && aulaData?.horario_fim) {
        setAulaInfo({ data_aula: aulaData.data_aula, horario_fim: aulaData.horario_fim });
      }

      // Verificar se a aula terminou há mais de 24h (para corrigir "em_aula" esquecido)
      let aulaEncerradaHa24h = false;
      if (aulaData?.data_aula && aulaData?.horario_fim) {
        const fimAula = new Date(`${aulaData.data_aula}T${aulaData.horario_fim}`);
        aulaEncerradaHa24h = Date.now() - fimAula.getTime() > 24 * 60 * 60 * 1000;
      }

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
          // Se a aula terminou há mais de 24h, saída esquecida → considerar presente
          aluno.status = aulaEncerradaHa24h ? 'presente' : 'em_aula';
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
    const ausentesSemJustificativa = frequenciaData.filter(
      (a) => a.status === 'ausente' && !a.justificativa
    );
    const todosAusentes = frequenciaData.filter(a => a.status === 'ausente');

    if (todosAusentes.length === 0) {
      toast.info('Não há faltas a notificar.');
      return;
    }

    if (!user?.id) {
      toast.error('Usuário admin não identificado.');
      return;
    }

    setIsSendingNotif(true);
    try {
      let notificadosCount = 0;

      // ── 1. Mensagem bloqueante de justificativa (apenas sem justificativa)
      if (ausentesSemJustificativa.length > 0) {
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

        const { data: existingRecipients } = await supabase
          .from('inbox_recipients')
          .select('student_email')
          .eq('message_id', messageId);

        const jaNotificados = new Set(
          (existingRecipients || []).map((r: any) => r.student_email)
        );

        const novos = ausentesSemJustificativa.filter(a => !jaNotificados.has(a.email));

        if (novos.length > 0) {
          const { error: recError } = await supabase.from('inbox_recipients').insert(
            novos.map(a => ({
              message_id: messageId,
              student_email: a.email,
              status: 'pendente',
            }))
          );
          if (recError) throw recError;
          notificadosCount = novos.length;
        }
      }

      // ── 2. Follow-ups agendados (todos os ausentes, incluindo os que justificaram)
      if (aulaInfo) {
        const { data: templates } = await supabase
          .from('inbox_templates' as any)
          .select('*')
          .in('acao', ['followup_gravacao', 'followup_duvidas']);

        const fimAula = new Date(`${aulaInfo.data_aula}T${aulaInfo.horario_fim}`);

        for (const tpl of (templates || []) as any[]) {
          if (!tpl.delay_horas) continue;

          const sendAt = new Date(fimAula.getTime() + tpl.delay_horas * 60 * 60 * 1000);
          const messageText = (tpl.message as string).replace(/\{\{titulo\}\}/g, aulaTitle);

          // Verificar se já existe mensagem para essa aula+acao
          const { data: existingFollowup } = await supabase
            .from('inbox_messages')
            .select('id')
            .eq('acao', tpl.acao)
            .eq('aula_id', aulaId)
            .maybeSingle();

          let followupMsgId: string;

          if (existingFollowup) {
            followupMsgId = existingFollowup.id;
          } else {
            const { data: newFollowup, error: followupError } = await supabase
              .from('inbox_messages')
              .insert({
                message: messageText,
                type: tpl.type,
                valid_until: null,
                created_by: user.id,
                aula_id: aulaId,
                acao: tpl.acao,
                send_at: sendAt.toISOString(),
              } as any)
              .select('id')
              .single();

            if (followupError || !newFollowup) continue;
            followupMsgId = newFollowup.id;
          }

          // Adicionar todos os ausentes que ainda não são destinatários
          const { data: existingRec } = await supabase
            .from('inbox_recipients')
            .select('student_email')
            .eq('message_id', followupMsgId);

          const jaDestinatarios = new Set((existingRec || []).map((r: any) => r.student_email));
          const novos = todosAusentes.filter(a => !jaDestinatarios.has(a.email));

          if (novos.length > 0) {
            await supabase.from('inbox_recipients').insert(
              novos.map(a => ({
                message_id: followupMsgId,
                student_email: a.email,
                status: 'pendente',
              }))
            );
          }
        }
      }

      const partes: string[] = [];
      if (notificadosCount > 0) {
        partes.push(`${notificadosCount} aluno${notificadosCount > 1 ? 's' : ''} notificado${notificadosCount > 1 ? 's' : ''}`);
      }
      if (aulaInfo) {
        partes.push('follow-ups agendados');
      }
      toast.success(partes.length > 0 ? partes.join(' • ') + '.' : 'Ação concluída.');
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
                disabled={isSendingNotif || frequenciaData.filter(a => a.status === 'ausente').length === 0}
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
