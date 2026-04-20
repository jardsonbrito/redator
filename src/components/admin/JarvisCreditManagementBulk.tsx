import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Bot, Plus, Settings, Users, History } from 'lucide-react';
import { useTurmasAtivas } from '@/hooks/useTurmasAtivas';

interface Student {
  id: string;
  nome: string;
  sobrenome: string;
  email: string;
  turma: string;
  jarvis_creditos: number;
}

interface JarvisCreditAudit {
  id: string;
  user_id: string;
  admin_id: string;
  action_type: string;
  credits_before: number;
  credits_after: number;
  reason: string;
  created_at: string;
}

export const JarvisCreditManagementBulk = () => {
  const { turmasDinamicas } = useTurmasAtivas();
  const { toast } = useToast();
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedTurma, setSelectedTurma] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [actionType, setActionType] = useState<'add' | 'remove' | 'set'>('add');
  const [creditAmount, setCreditAmount] = useState<number>(1);
  const [reason, setReason] = useState<string>('');
  const [creditHistory, setCreditHistory] = useState<JarvisCreditAudit[]>([]);
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
  const [actionDialogOpen, setActionDialogOpen] = useState(false);

  // Para ação em lote
  const [bulkAction, setBulkAction] = useState<'add' | 'remove' | 'set'>('add');
  const [bulkAmount, setBulkAmount] = useState<number>(1);
  const [bulkReason, setBulkReason] = useState<string>('');

  useEffect(() => {
    if (selectedTurma) {
      loadStudents();
    }
  }, [selectedTurma]);

  const loadStudents = async () => {
    if (!selectedTurma) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, nome, sobrenome, email, turma, jarvis_creditos')
        .eq('user_type', 'aluno')
        .eq('turma', selectedTurma)
        .eq('ativo', true)
        .order('nome');

      if (error) throw error;
      setStudents(data || []);
    } catch (error) {
      console.error('Erro ao carregar alunos:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar alunos",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreditAction = async () => {
    if (!selectedStudent || creditAmount < 0) {
      toast({
        title: "Erro",
        description: "Dados inválidos",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      // Buscar admin_id
      const adminSession = JSON.parse(localStorage.getItem('admin_session') || '{}');
      const { data: adminData } = await supabase
        .from('admin_users')
        .select('id')
        .eq('email', adminSession.email)
        .single();

      if (!adminData) throw new Error('Admin não encontrado');

      // Chamar RPC apropriada
      const rpcName = actionType === 'add'
        ? 'add_jarvis_credits'
        : actionType === 'remove'
          ? 'remove_jarvis_credits'
          : 'set_jarvis_credits';
      const rpcParams = actionType === 'set' ? {
        target_user_id: selectedStudent.id,
        new_amount: creditAmount,
        admin_user_id: adminData.id,
        reason_text: reason || 'Definição manual de créditos Jarvis'
      } : {
        target_user_id: selectedStudent.id,
        credit_amount: creditAmount,
        admin_user_id: adminData.id,
        reason_text: reason || (actionType === 'add' ? 'Adição' : 'Remoção') + ' manual de créditos Jarvis'
      };

      const { error } = await supabase.rpc(rpcName, rpcParams);

      if (error) throw error;

      const actionLabel = actionType === 'add' ? 'adicionados' : actionType === 'remove' ? 'removidos' : 'definidos';
      toast({
        title: "✅ Sucesso",
        description: `Créditos Jarvis ${actionLabel} com sucesso!`,
        className: "border-green-200 bg-green-50 text-green-900"
      });

      setActionDialogOpen(false);
      setCreditAmount(1);
      setReason('');
      loadStudents();
    } catch (error: any) {
      console.error('Erro ao atualizar créditos Jarvis:', error);
      toast({
        title: "Erro",
        description: error.message || "Erro ao atualizar créditos Jarvis",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleBulkAction = async () => {
    if (!selectedTurma || bulkAmount < 0) {
      toast({
        title: "Erro",
        description: "Selecione uma turma e informe a quantidade",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      const adminSession = JSON.parse(localStorage.getItem('admin_session') || '{}');
      const { data: adminData } = await supabase
        .from('admin_users')
        .select('id')
        .eq('email', adminSession.email)
        .single();

      if (!adminData) throw new Error('Admin não encontrado');

      const rpcName = bulkAction === 'add'
        ? 'add_jarvis_credits'
        : bulkAction === 'remove'
          ? 'remove_jarvis_credits'
          : 'set_jarvis_credits';

      for (const student of students) {
        const rpcParams = bulkAction === 'set' ? {
          target_user_id: student.id,
          new_amount: bulkAmount,
          admin_user_id: adminData.id,
          reason_text: bulkReason || `Definição em lote - ${selectedTurma}`
        } : {
          target_user_id: student.id,
          credit_amount: bulkAmount,
          admin_user_id: adminData.id,
          reason_text: bulkReason || `${bulkAction === 'add' ? 'Adição' : 'Remoção'} em lote - ${selectedTurma}`
        };

        await supabase.rpc(rpcName, rpcParams);
      }

      toast({
        title: "✅ Sucesso",
        description: `Créditos Jarvis atualizados em lote para ${students.length} alunos`,
        className: "border-green-200 bg-green-50 text-green-900"
      });

      setBulkAmount(1);
      setBulkReason('');
      loadStudents();
    } catch (error: any) {
      console.error('Erro ao atualizar créditos em lote:', error);
      toast({
        title: "Erro",
        description: error.message || "Erro ao atualizar créditos em lote",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const loadCreditHistory = async (studentId: string) => {
    try {
      const { data, error } = await supabase
        .from('jarvis_credit_audit')
        .select('*')
        .eq('user_id', studentId)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      setCreditHistory(data || []);
    } catch (error) {
      console.error('Erro ao carregar histórico:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar histórico",
        variant: "destructive"
      });
    }
  };

  const formatAction = (action: string) => {
    const actions: { [key: string]: string } = {
      add: 'Adicionado',
      remove: 'Removido',
      set: 'Definido',
      consume: 'Consumido'
    };
    return actions[action] || action;
  };

  return (
    <div className="space-y-6">
      <Card className="border-indigo-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-indigo-600" />
            Gerenciamento de Créditos Jarvis
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Sistema de créditos independente para o assistente Jarvis
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Selecionar Turma</Label>
              <Select value={selectedTurma} onValueChange={setSelectedTurma}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma turma" />
                </SelectTrigger>
                <SelectContent>
                  {turmasDinamicas.map(({ valor, label }) => (
                    <SelectItem key={valor} value={valor}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {selectedTurma && (
            <Card className="border-indigo-100">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Users className="h-5 w-5 text-indigo-600" />
                  Ação em Lote - {selectedTurma}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <Label>Ação</Label>
                    <Select value={bulkAction} onValueChange={(value: 'add' | 'remove' | 'set') => setBulkAction(value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="add">Adicionar</SelectItem>
                        <SelectItem value="remove">Remover</SelectItem>
                        <SelectItem value="set">Definir</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Quantidade</Label>
                    <Input
                      type="number"
                      min="0"
                      value={bulkAmount}
                      onChange={(e) => setBulkAmount(Number(e.target.value))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Motivo (opcional)</Label>
                    <Input
                      value={bulkReason}
                      onChange={(e) => setBulkReason(e.target.value)}
                      placeholder="Ex: Bônus mensal Jarvis"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>&nbsp;</Label>
                    <Button
                      onClick={handleBulkAction}
                      disabled={loading || !selectedTurma || bulkAmount < 0}
                      className="w-full bg-indigo-600 hover:bg-indigo-700"
                    >
                      Aplicar em Lote
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>

      {selectedTurma && (
        <Card className="border-indigo-200">
          <CardHeader>
            <CardTitle>Alunos - {selectedTurma} ({students.length} encontrados)</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
                <p className="mt-2 text-muted-foreground">Carregando alunos...</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Créditos Jarvis</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {students.map((student) => (
                    <TableRow key={student.id}>
                      <TableCell>{student.nome} {student.sobrenome}</TableCell>
                      <TableCell>{student.email}</TableCell>
                      <TableCell>
                        <Badge
                          variant={student.jarvis_creditos > 0 ? "default" : "secondary"}
                          className="font-mono bg-indigo-100 text-indigo-900"
                        >
                          {student.jarvis_creditos || 0}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Dialog open={actionDialogOpen && selectedStudent?.id === student.id} onOpenChange={setActionDialogOpen}>
                            <DialogTrigger asChild>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setSelectedStudent(student)}
                                className="border-indigo-300 text-indigo-700 hover:bg-indigo-50"
                              >
                                <Settings className="h-4 w-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle className="flex items-center gap-2">
                                  <Bot className="h-5 w-5 text-indigo-600" />
                                  Gerenciar Créditos Jarvis - {student.nome}
                                </DialogTitle>
                              </DialogHeader>
                              <div className="space-y-4">
                                <Alert className="border-indigo-200 bg-indigo-50">
                                  <AlertDescription>
                                    <strong>Créditos Jarvis atuais:</strong> {student.jarvis_creditos || 0}
                                  </AlertDescription>
                                </Alert>

                                <div className="grid grid-cols-2 gap-4">
                                  <div className="space-y-2">
                                    <Label>Ação</Label>
                                    <Select value={actionType} onValueChange={(value: 'add' | 'remove' | 'set') => setActionType(value)}>
                                      <SelectTrigger>
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="add">Adicionar</SelectItem>
                                        <SelectItem value="remove">Remover</SelectItem>
                                        <SelectItem value="set">Definir</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>
                                  <div className="space-y-2">
                                    <Label>Quantidade</Label>
                                    <Input
                                      type="number"
                                      min="0"
                                      value={creditAmount}
                                      onChange={(e) => setCreditAmount(Number(e.target.value))}
                                    />
                                  </div>
                                </div>

                                <div className="space-y-2">
                                  <Label>Motivo (opcional)</Label>
                                  <Textarea
                                    value={reason}
                                    onChange={(e) => setReason(e.target.value)}
                                    placeholder="Descreva o motivo da alteração..."
                                    rows={3}
                                  />
                                </div>

                                <div className="flex gap-2">
                                  <Button
                                    onClick={handleCreditAction}
                                    disabled={loading || creditAmount < 0}
                                    className="flex-1 bg-indigo-600 hover:bg-indigo-700"
                                  >
                                    {loading ? 'Processando...' : 'Aplicar'}
                                  </Button>
                                  <Button
                                    variant="outline"
                                    onClick={() => setActionDialogOpen(false)}
                                  >
                                    Cancelar
                                  </Button>
                                </div>
                              </div>
                            </DialogContent>
                          </Dialog>

                          <Dialog open={historyDialogOpen && selectedStudent?.id === student.id} onOpenChange={setHistoryDialogOpen}>
                            <DialogTrigger asChild>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setSelectedStudent(student);
                                  loadCreditHistory(student.id);
                                }}
                                className="border-indigo-300 text-indigo-700 hover:bg-indigo-50"
                              >
                                <History className="h-4 w-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-2xl">
                              <DialogHeader>
                                <DialogTitle className="flex items-center gap-2">
                                  <History className="h-5 w-5 text-indigo-600" />
                                  Histórico de Créditos Jarvis - {student.nome}
                                </DialogTitle>
                              </DialogHeader>
                              <div className="max-h-96 overflow-y-auto">
                                <Table>
                                  <TableHeader>
                                    <TableRow>
                                      <TableHead>Data</TableHead>
                                      <TableHead>Ação</TableHead>
                                      <TableHead>Anterior</TableHead>
                                      <TableHead>Novo</TableHead>
                                      <TableHead>Diferença</TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {creditHistory.map((audit) => (
                                      <TableRow key={audit.id}>
                                        <TableCell className="text-xs">
                                          {new Date(audit.created_at).toLocaleString('pt-BR')}
                                        </TableCell>
                                        <TableCell>
                                          <Badge variant="outline" className="text-xs">
                                            {formatAction(audit.action_type)}
                                          </Badge>
                                        </TableCell>
                                        <TableCell>{audit.credits_before}</TableCell>
                                        <TableCell>{audit.credits_after}</TableCell>
                                        <TableCell>
                                          <span
                                            className={
                                              audit.credits_after >= audit.credits_before
                                                ? "text-green-600"
                                                : "text-red-600"
                                            }
                                          >
                                            {audit.credits_after >= audit.credits_before ? '+' : ''}
                                            {audit.credits_after - audit.credits_before}
                                          </span>
                                        </TableCell>
                                      </TableRow>
                                    ))}
                                  </TableBody>
                                </Table>
                                {creditHistory.length === 0 && (
                                  <p className="text-center text-muted-foreground py-4">
                                    Nenhum histórico encontrado
                                  </p>
                                )}
                              </div>
                            </DialogContent>
                          </Dialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
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
    </div>
  );
};
