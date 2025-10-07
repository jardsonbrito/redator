import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Crown, Edit2, History, Calendar, MoreVertical, Trash2, Settings2 } from 'lucide-react';
import { formatDateSafe, isDateActiveOrFuture, formatDateTimeSafe } from '@/utils/dateUtils';
import { TURMAS_VALIDAS, formatTurmaDisplay } from '@/utils/turmaUtils';

interface Student {
  id: string;
  nome: string;
  sobrenome: string;
  email: string;
  turma: string;
}

interface Subscription {
  id: string;
  aluno_id: string;
  plano: 'Liderança' | 'Lapidação' | 'Largada' | 'Bolsista';
  data_inscricao: string;
  data_validade: string;
  status: 'Ativo' | 'Vencido';
}

interface SubscriptionHistory {
  id: string;
  aluno_id: string;
  alteracao: string;
  data_alteracao: string;
  admin_responsavel: string;
}

const TURMAS = TURMAS_VALIDAS;
const PLANOS = ['Liderança', 'Lapidação', 'Largada', 'Bolsista'] as const;

export const SubscriptionManagementClean = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [students, setStudents] = useState<Student[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [selectedTurma, setSelectedTurma] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [subscriptionHistory, setSubscriptionHistory] = useState<SubscriptionHistory[]>([]);
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingStudentId, setEditingStudentId] = useState<string | null>(null);

  // Estados do formulário de edição
  const [editForm, setEditForm] = useState({
    plano: '' as 'Liderança' | 'Lapidação' | 'Largada' | '',
    data_inscricao: '2025-02-03',
    data_validade: '',
    reason: ''
  });

  // Verificar parâmetro turma da URL ou sessionStorage
  useEffect(() => {
    const turmaParam = searchParams.get('turma');
    if (turmaParam && TURMAS.includes(decodeURIComponent(turmaParam))) {
      const turmaNormalizada = decodeURIComponent(turmaParam);
      setSelectedTurma(turmaNormalizada);
      sessionStorage.setItem('last_selected_turma', turmaNormalizada);
    } else {
      // Tentar recuperar última turma selecionada do sessionStorage
      const lastTurma = sessionStorage.getItem('last_selected_turma');
      if (lastTurma && TURMAS.includes(lastTurma)) {
        setSelectedTurma(lastTurma);
      }
    }
  }, [searchParams]);

  useEffect(() => {
    if (selectedTurma) {
      loadStudentsAndSubscriptions();
    }
  }, [selectedTurma]);

  const loadStudentsAndSubscriptions = async () => {
    if (!selectedTurma) return;

    setLoading(true);
    try {
      // Carregar alunos da turma
      const { data: studentsData, error: studentsError } = await supabase
        .from('profiles')
        .select('id, nome, sobrenome, email, turma')
        .eq('user_type', 'aluno')
        .eq('turma', selectedTurma)
        .eq('ativo', true)
        .order('nome');

      if (studentsError) throw studentsError;

      // Carregar assinaturas dos alunos
      const studentIds = studentsData?.map(s => s.id) || [];
      const { data: subscriptionsData, error: subscriptionsError } = await supabase
        .from('assinaturas')
        .select('*')
        .in('aluno_id', studentIds)
        .order('data_validade', { ascending: false });

      if (subscriptionsError && subscriptionsError.code !== '42P01') {
        console.error('Erro ao carregar assinaturas:', subscriptionsError);
      }

      // Processar assinaturas para calcular status usando função segura
      const processedSubscriptions = (subscriptionsData || []).map(sub => ({
        ...sub,
        status: isDateActiveOrFuture(sub.data_validade) ? 'Ativo' : 'Vencido'
      })) as Subscription[];

      setStudents(studentsData || []);
      setSubscriptions(processedSubscriptions);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar dados da turma",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const getStudentSubscription = (studentId: string) => {
    return subscriptions.find(sub => sub.aluno_id === studentId);
  };

  const handleCreateOrUpdateSubscription = async () => {
    if (!selectedStudent || !editForm.plano || !editForm.data_validade) {
      toast({
        title: "Erro",
        description: "Preencha todos os campos obrigatórios",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      const existingSubscription = getStudentSubscription(selectedStudent.id);

      if (existingSubscription) {
        // Atualizar assinatura existente
        const { error } = await supabase
          .from('assinaturas')
          .update({
            plano: editForm.plano,
            data_inscricao: editForm.data_inscricao,
            data_validade: editForm.data_validade
          })
          .eq('id', existingSubscription.id);

        if (error) throw error;

        // Registrar histórico
        await supabase
          .from('subscription_history')
          .insert({
            aluno_id: selectedStudent.id,
            alteracao: `Assinatura atualizada: ${editForm.plano}, validade ${formatDateSafe(editForm.data_validade)}`,
            admin_responsavel: 'Administrador'
          });

        toast({
          title: "Sucesso",
          description: "Assinatura atualizada com sucesso"
        });
      } else {
        // Criar nova assinatura
        const { error } = await supabase
          .from('assinaturas')
          .insert({
            aluno_id: selectedStudent.id,
            plano: editForm.plano,
            data_inscricao: editForm.data_inscricao,
            data_validade: editForm.data_validade
          });

        if (error) throw error;

        // Registrar histórico
        await supabase
          .from('subscription_history')
          .insert({
            aluno_id: selectedStudent.id,
            alteracao: `Nova assinatura criada: ${editForm.plano}, validade ${formatDateSafe(editForm.data_validade)}`,
            admin_responsavel: 'Administrador'
          });

        toast({
          title: "Sucesso",
          description: "Assinatura criada com sucesso"
        });
      }

      closeEditDialog();
      loadStudentsAndSubscriptions();
    } catch (error) {
      console.error('Erro ao salvar assinatura:', error);
      toast({
        title: "Erro",
        description: "Erro ao salvar assinatura",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const deleteSubscription = async (subscriptionId: string) => {
    if (!confirm('Tem certeza que deseja excluir esta assinatura?')) {
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('assinaturas')
        .delete()
        .eq('id', subscriptionId);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Assinatura excluída com sucesso",
      });

      loadStudentsAndSubscriptions();
    } catch (error) {
      console.error('Erro ao excluir assinatura:', error);
      toast({
        title: "Erro",
        description: "Erro ao excluir assinatura",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const loadSubscriptionHistory = async (studentId: string) => {
    try {
      const { data, error } = await supabase
        .from('subscription_history')
        .select('*')
        .eq('aluno_id', studentId)
        .order('data_alteracao', { ascending: false })
        .limit(20);

      if (error) throw error;
      setSubscriptionHistory(data || []);
    } catch (error) {
      console.error('Erro ao carregar histórico:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar histórico",
        variant: "destructive"
      });
    }
  };

  const openEditDialog = (student: Student) => {
    const subscription = getStudentSubscription(student.id);
    setSelectedStudent(student);
    setEditingStudentId(student.id);
    setEditForm({
      plano: subscription?.plano || '',
      data_inscricao: subscription?.data_inscricao || '2025-02-03',
      data_validade: subscription?.data_validade || '',
      reason: ''
    });
    setEditDialogOpen(true);
  };

  const closeEditDialog = () => {
    setEditDialogOpen(false);
    setEditingStudentId(null);
    setSelectedStudent(null);
    setEditForm({
      plano: '',
      data_inscricao: '2025-02-03',
      data_validade: '',
      reason: ''
    });
  };

  const getPlanoBadge = (plano: string) => {
    const colors = {
      'Liderança': 'bg-purple-100 text-purple-800',
      'Lapidação': 'bg-blue-100 text-blue-800',
      'Largada': 'bg-orange-100 text-orange-800',
      'Bolsista': 'bg-green-100 text-green-800'
    };
    return <Badge className={colors[plano as keyof typeof colors]}>{plano}</Badge>;
  };

  const getStatusBadge = (status: string) => {
    return status === 'Ativo'
      ? <Badge className="bg-green-100 text-green-800">Ativo</Badge>
      : <Badge variant="destructive">Vencido</Badge>;
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Crown className="h-5 w-5" />
            Gerenciamento de Assinaturas
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Selecionar Turma</Label>
              <Select
                value={selectedTurma}
                onValueChange={(value) => {
                  setSelectedTurma(value);
                  sessionStorage.setItem('last_selected_turma', value);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma turma" />
                </SelectTrigger>
                <SelectContent>
                  {TURMAS.map((turma) => (
                    <SelectItem key={turma} value={turma}>
                      {formatTurmaDisplay(turma)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {selectedTurma && (
        <Card>
          <CardHeader>
            <CardTitle>Alunos - {selectedTurma} ({students.length} encontrados)</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                <p className="mt-2 text-muted-foreground">Carregando alunos...</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Plano</TableHead>
                    <TableHead>Data de Validade</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {students.map((student) => {
                    const subscription = getStudentSubscription(student.id);
                    return (
                      <TableRow key={student.id}>
                        <TableCell>{student.nome} {student.sobrenome}</TableCell>
                        <TableCell>{student.email}</TableCell>
                        <TableCell>
                          {subscription ? getPlanoBadge(subscription.plano) : (
                            <Badge variant="outline">Sem Assinatura</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {subscription ? formatDateSafe(subscription.data_validade) : '-'}
                        </TableCell>
                        <TableCell>
                          {subscription ? getStatusBadge(subscription.status) : (
                            <Badge variant="outline">Inativo</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            {/* Menu de três pontos */}
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button size="sm" variant="outline">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                  onSelect={(e) => {
                                    e.preventDefault();
                                    openEditDialog(student);
                                  }}
                                >
                                  <Edit2 className="h-4 w-4 mr-2" />
                                  {subscription ? 'Editar' : 'Criar'}
                                </DropdownMenuItem>

                                  {subscription && (
                                    <DropdownMenuItem
                                      onClick={() => deleteSubscription(subscription.id)}
                                      className="text-red-600"
                                    >
                                      <Trash2 className="h-4 w-4 mr-2" />
                                      Excluir
                                    </DropdownMenuItem>
                                  )}

                                  <DropdownMenuItem
                                    onClick={() => {
                                      navigate(`/admin/customize-student-plan/${student.id}`);
                                    }}
                                  >
                                    <Settings2 className="h-4 w-4 mr-2" />
                                    Personalizar Plano
                                  </DropdownMenuItem>

                                  <DropdownMenuItem
                                    onSelect={(e) => {
                                      e.preventDefault();
                                      setSelectedStudent(student);
                                      loadSubscriptionHistory(student.id);
                                      setHistoryDialogOpen(true);
                                    }}
                                  >
                                    <History className="h-4 w-4 mr-2" />
                                    Histórico
                                  </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}

            {!loading && students.length === 0 && (
              <div className="text-center py-8">
                <p className="text-muted-foreground">Nenhum aluno encontrado para a turma selecionada.</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Dialog de Edição de Assinatura */}
      <Dialog open={editDialogOpen} onOpenChange={closeEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {selectedStudent && getStudentSubscription(selectedStudent.id) ? 'Editar' : 'Criar'} Assinatura
              {selectedStudent && ` - ${selectedStudent.nome}`}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4">
              <div className="space-y-2">
                <Label>Plano *</Label>
                <Select
                  value={editForm.plano}
                  onValueChange={(value: 'Liderança' | 'Lapidação' | 'Largada' | 'Bolsista') =>
                    setEditForm(prev => ({ ...prev, plano: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o plano" />
                  </SelectTrigger>
                  <SelectContent>
                    {PLANOS.map((plano) => (
                      <SelectItem key={plano} value={plano}>
                        {plano}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Data de Inscrição</Label>
                  <Input
                    type="date"
                    value={editForm.data_inscricao}
                    onChange={(e) => setEditForm(prev => ({ ...prev, data_inscricao: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Data de Validade *</Label>
                  <Input
                    type="date"
                    value={editForm.data_validade}
                    onChange={(e) => setEditForm(prev => ({ ...prev, data_validade: e.target.value }))}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Motivo da Alteração (opcional)</Label>
                <Textarea
                  value={editForm.reason}
                  onChange={(e) => setEditForm(prev => ({ ...prev, reason: e.target.value }))}
                  placeholder="Descreva o motivo da alteração..."
                  rows={3}
                />
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                onClick={handleCreateOrUpdateSubscription}
                disabled={loading || !editForm.plano || !editForm.data_validade}
                className="flex-1"
              >
                {loading ? 'Salvando...' : (selectedStudent && getStudentSubscription(selectedStudent.id) ? 'Atualizar' : 'Criar')}
              </Button>
              <Button
                variant="outline"
                onClick={closeEditDialog}
              >
                Cancelar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog de Histórico */}
      <Dialog open={historyDialogOpen} onOpenChange={setHistoryDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Histórico de Assinaturas - {selectedStudent?.nome}</DialogTitle>
          </DialogHeader>
          <div className="max-h-96 overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Alteração</TableHead>
                  <TableHead>Responsável</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {subscriptionHistory.map((history) => (
                  <TableRow key={history.id}>
                    <TableCell>
                      {formatDateTimeSafe(history.data_alteracao)}
                    </TableCell>
                    <TableCell>{history.alteracao}</TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {history.admin_responsavel}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {subscriptionHistory.length === 0 && (
              <p className="text-center text-muted-foreground py-4">
                Nenhum histórico encontrado
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};