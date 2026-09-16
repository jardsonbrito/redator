import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { CreditCard, History, Plus, Minus, Equal } from 'lucide-react';

interface CreditAudit {
  id: string;
  action: string;
  old_credits: number;
  new_credits: number;
  created_at: string;
}

interface StudentCreditSectionProps {
  studentId: string;
  studentName: string;
}

type ActionType = 'add' | 'remove' | 'set';

const ACTION_LABELS: Record<ActionType, string> = {
  add: 'Adicionar',
  remove: 'Remover',
  set: 'Definir',
};

const ACTION_AUDIT_LABELS: Record<string, string> = {
  add: 'Adicionado',
  remove: 'Removido',
  set: 'Definido',
};

export function StudentCreditSection({ studentId, studentName }: StudentCreditSectionProps) {
  const { toast } = useToast();
  const [credits, setCredits] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [actionOpen, setActionOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [history, setHistory] = useState<CreditAudit[]>([]);
  const [actionType, setActionType] = useState<ActionType>('add');
  const [amount, setAmount] = useState(1);
  const [reason, setReason] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('creditos')
        .eq('id', studentId)
        .single();
      if (error) throw error;
      setCredits(data?.creditos ?? 0);
    } catch {
      toast({ title: 'Erro ao carregar créditos', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const loadHistory = async () => {
    const { data } = await supabase
      .from('credit_audit')
      .select('id, action, old_credits, new_credits, created_at')
      .eq('user_id', studentId)
      .order('created_at', { ascending: false })
      .limit(30);
    setHistory(data || []);
  };

  useEffect(() => { load(); }, [studentId]);

  const handleSave = async () => {
    if (amount <= 0) {
      toast({ title: 'Informe uma quantidade válida', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      let newCredits: number;
      switch (actionType) {
        case 'add': newCredits = credits + amount; break;
        case 'remove': newCredits = Math.max(0, credits - amount); break;
        case 'set': newCredits = amount; break;
      }

      const { error } = await supabase
        .from('profiles')
        .update({ creditos: newCredits })
        .eq('id', studentId);
      if (error) throw error;

      await supabase.from('credit_audit').insert({
        user_id: studentId,
        action: actionType,
        old_credits: credits,
        new_credits: newCredits,
      });

      toast({ title: `Créditos atualizados: ${credits} → ${newCredits}` });
      setCredits(newCredits);
      setActionOpen(false);
      setAmount(1);
      setReason('');
    } catch {
      toast({ title: 'Erro ao atualizar créditos', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="py-8 text-center text-sm text-muted-foreground">Carregando créditos...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CreditCard className="h-4 w-4 text-blue-500" />
            <span className="text-sm font-medium">Créditos de redação</span>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => setActionOpen(true)}>
              <Plus className="h-3 w-3 mr-1" />Gerenciar
            </Button>
            <Button size="sm" variant="outline" onClick={async () => { await loadHistory(); setHistoryOpen(true); }}>
              <History className="h-3 w-3 mr-1" />Histórico
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Badge
            className={`text-lg font-bold px-4 py-1 ${credits > 0 ? 'bg-blue-100 text-blue-800' : 'bg-red-100 text-red-800'}`}
          >
            {credits}
          </Badge>
          <span className="text-sm text-muted-foreground">
            {credits === 1 ? 'crédito disponível' : 'créditos disponíveis'}
          </span>
        </div>
      </div>

      {/* Dialog de ação */}
      <Dialog open={actionOpen} onOpenChange={setActionOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Gerenciar Créditos — {studentName}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="rounded-md bg-muted/40 border px-4 py-2 text-sm">
              Saldo atual: <strong>{credits} crédito{credits !== 1 ? 's' : ''}</strong>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Ação</Label>
                <Select value={actionType} onValueChange={(v: ActionType) => setActionType(v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="add"><span className="flex items-center gap-1"><Plus className="h-3 w-3" />Adicionar</span></SelectItem>
                    <SelectItem value="remove"><span className="flex items-center gap-1"><Minus className="h-3 w-3" />Remover</span></SelectItem>
                    <SelectItem value="set"><span className="flex items-center gap-1"><Equal className="h-3 w-3" />Definir</span></SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Quantidade</Label>
                <Input
                  type="number"
                  min={1}
                  value={amount}
                  onChange={(e) => setAmount(Math.max(1, Number(e.target.value)))}
                />
              </div>
            </div>

            {actionType !== 'set' && (
              <p className="text-xs text-muted-foreground">
                Resultado: {credits} {actionType === 'add' ? '+' : '−'} {amount} ={' '}
                <strong>
                  {actionType === 'add' ? credits + amount : Math.max(0, credits - amount)} crédito{(actionType === 'add' ? credits + amount : Math.max(0, credits - amount)) !== 1 ? 's' : ''}
                </strong>
              </p>
            )}

            <div className="space-y-2">
              <Label>Motivo (opcional)</Label>
              <Textarea
                rows={2}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Ex: Bônus mensal, correção manual..."
              />
            </div>

            <div className="flex gap-2">
              <Button onClick={handleSave} disabled={saving || amount <= 0} className="flex-1">
                {saving ? 'Salvando...' : ACTION_LABELS[actionType]}
              </Button>
              <Button variant="outline" onClick={() => setActionOpen(false)}>Cancelar</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog histórico */}
      <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Histórico de Créditos — {studentName}</DialogTitle>
          </DialogHeader>
          <div className="max-h-80 overflow-y-auto">
            {history.length === 0 ? (
              <p className="text-center text-muted-foreground py-4 text-sm">Nenhum registro encontrado.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Ação</TableHead>
                    <TableHead>Anterior</TableHead>
                    <TableHead>Novo</TableHead>
                    <TableHead>Δ</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {history.map((h) => {
                    const diff = h.new_credits - h.old_credits;
                    return (
                      <TableRow key={h.id}>
                        <TableCell className="text-xs">
                          {new Date(h.created_at).toLocaleString('pt-BR')}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">{ACTION_AUDIT_LABELS[h.action] ?? h.action}</Badge>
                        </TableCell>
                        <TableCell className="text-xs">{h.old_credits}</TableCell>
                        <TableCell className="text-xs">{h.new_credits}</TableCell>
                        <TableCell className={`text-xs font-medium ${diff >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {diff >= 0 ? '+' : ''}{diff}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
