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
import { Plus, Minus, Eye, Users, CreditCard, History } from 'lucide-react';

interface Student {
  id: string;
  nome: string;
  sobrenome: string;
  email: string;
  turma: string;
  creditos: number;
}

interface CreditAudit {
  id: string;
  user_id: string;
  admin_id: string;
  action: string;
  old_credits: number;
  new_credits: number;
  created_at: string;
}

const TURMAS = ['Turma A', 'Turma B', 'Turma C', 'Turma D', 'Turma E'];

export const CreditManagement = () => {
  const { toast } = useToast();
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedTurma, setSelectedTurma] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [actionType, setActionType] = useState<'add' | 'remove' | 'set'>('add');
  const [creditAmount, setCreditAmount] = useState<number>(1);
  const [reason, setReason] = useState<string>('');
  const [creditHistory, setCreditHistory] = useState<CreditAudit[]>([]);
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
        .select('id, nome, sobrenome, email, turma, creditos')
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
    if (!selectedStudent || creditAmount <= 0) {
      toast({
        title: "Erro",
        description: "Dados inválidos",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      const currentCredits = selectedStudent.creditos || 0;
      let newCredits: number;

      switch (actionType) {
        case 'add':
          newCredits = currentCredits + creditAmount;
          break;
        case 'remove':
          newCredits = Math.max(0, currentCredits - creditAmount);
          break;
        case 'set':
          newCredits = creditAmount;
          break;
        default:
          throw new Error('Tipo de ação inválido');
      }

      // Atualizar créditos do aluno
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ creditos: newCredits })
        .eq('id', selectedStudent.id);

      if (updateError) throw updateError;

      // Registrar no audit
      const { error: auditError } = await supabase
        .from('credit_audit')
        .insert({
          user_id: selectedStudent.id,
          admin_id: null, // Será preenchido pelo backend se necessário
          action: actionType,
          old_credits: currentCredits,
          new_credits: newCredits
        });

      if (auditError) {
        console.warn('Erro ao registrar audit (não crítico):', auditError);
      }

      toast({
        title: "Sucesso",
        description: "Créditos atualizados com sucesso"
      });
      
      setActionDialogOpen(false);
      setCreditAmount(1);
      setReason('');
      loadStudents();
    } catch (error) {
      console.error('Erro ao atualizar créditos:', error);
      toast({
        title: "Erro",
        description: "Erro ao atualizar créditos",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleBulkAction = async () => {
    if (!selectedTurma || bulkAmount <= 0) {
      toast({
        title: "Erro",
        description: "Selecione uma turma e informe a quantidade",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      const updates = students.map(student => {
        const currentCredits = student.creditos || 0;
        let newCredits: number;

        switch (bulkAction) {
          case 'add':
            newCredits = currentCredits + bulkAmount;
            break;
          case 'remove':
            newCredits = Math.max(0, currentCredits - bulkAmount);
            break;
          case 'set':
            newCredits = bulkAmount;
            break;
          default:
            newCredits = currentCredits;
        }

        return {
          id: student.id,
          creditos: newCredits,
          oldCredits: currentCredits
        };
      });

      // Atualizar todos os alunos
      for (const update of updates) {
        await supabase
          .from('profiles')
          .update({ creditos: update.creditos })
          .eq('id', update.id);

        // Registrar no audit
        await supabase
          .from('credit_audit')
          .insert({
            user_id: update.id,
            admin_id: null,
            action: bulkAction,
            old_credits: update.oldCredits,
            new_credits: update.creditos
          });
      }

      toast({
        title: "Sucesso",
        description: `Créditos atualizados em lote para ${updates.length} alunos`
      });
      
      setBulkAmount(1);
      setBulkReason('');
      loadStudents();
    } catch (error) {
      console.error('Erro ao atualizar créditos em lote:', error);
      toast({
        title: "Erro",
        description: "Erro ao atualizar créditos em lote",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const loadCreditHistory = async (studentId: string) => {
    try {
      const { data, error } = await supabase
        .from('credit_audit')
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
      set: 'Definido'
    };
    return actions[action] || action;
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Gerenciamento de Créditos
          </CardTitle>
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
                  {TURMAS.map((turma) => (
                    <SelectItem key={turma} value={turma}>
                      {turma}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {selectedTurma && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Users className="h-5 w-5" />
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
                      min="1"
                      value={bulkAmount}
                      onChange={(e) => setBulkAmount(Number(e.target.value))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Motivo (opcional)</Label>
                    <Input
                      value={bulkReason}
                      onChange={(e) => setBulkReason(e.target.value)}
                      placeholder="Ex: Bônus mensal"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>&nbsp;</Label>
                    <Button 
                      onClick={handleBulkAction}
                      disabled={loading || !selectedTurma || bulkAmount <= 0}
                      className="w-full"
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
        <Card>
          <CardHeader>
            <CardTitle>Alunos - {selectedTurma}</CardTitle>
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
                    <TableHead>Créditos</TableHead>
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
                          variant={student.creditos > 0 ? "default" : "destructive"}
                          className="font-mono"
                        >
                          {student.creditos || 0}
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
                              >
                                <Plus className="h-4 w-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Gerenciar Créditos - {student.nome}</DialogTitle>
                              </DialogHeader>
                              <div className="space-y-4">
                                <Alert>
                                  <AlertDescription>
                                    <strong>Créditos atuais:</strong> {student.creditos || 0}
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
                                      min="1"
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
                                    disabled={loading || creditAmount <= 0}
                                    className="flex-1"
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
                              >
                                <History className="h-4 w-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-2xl">
                              <DialogHeader>
                                <DialogTitle>Histórico de Créditos - {student.nome}</DialogTitle>
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
                                        <TableCell>
                                          {new Date(audit.created_at).toLocaleString('pt-BR')}
                                        </TableCell>
                                        <TableCell>
                                          <Badge variant="outline">
                                            {formatAction(audit.action)}
                                          </Badge>
                                        </TableCell>
                                        <TableCell>{audit.old_credits}</TableCell>
                                        <TableCell>{audit.new_credits}</TableCell>
                                        <TableCell>
                                          <span 
                                            className={
                                              audit.new_credits >= audit.old_credits 
                                                ? "text-green-600" 
                                                : "text-red-600"
                                            }
                                          >
                                            {audit.new_credits >= audit.old_credits ? '+' : ''}
                                            {audit.new_credits - audit.old_credits}
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
          </CardContent>
        </Card>
      )}
    </div>
  );
};