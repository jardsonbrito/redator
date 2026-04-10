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
import { Edit2, History, Trash2, Plus, Crown } from 'lucide-react';
import { formatDateSafe, isDateActiveOrFuture, formatDateTimeSafe } from '@/utils/dateUtils';

const PLANOS = ['Liderança', 'Lapidação', 'Largada', 'Bolsista'] as const;
type Plano = typeof PLANOS[number];

interface Subscription {
  id: string;
  aluno_id: string;
  plano: Plano;
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

interface StudentSubscriptionSectionProps {
  studentId: string;
  studentName: string;
  onPlanoChange?: (plano: Plano | null) => void;
}

const planoBadgeClass: Record<string, string> = {
  Liderança: 'bg-purple-100 text-purple-800',
  Lapidação: 'bg-blue-100 text-blue-800',
  Largada: 'bg-orange-100 text-orange-800',
  Bolsista: 'bg-green-100 text-green-800',
};

export function StudentSubscriptionSection({ studentId, studentName, onPlanoChange }: StudentSubscriptionSectionProps) {
  const { toast } = useToast();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [history, setHistory] = useState<SubscriptionHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    plano: '' as Plano | '',
    data_inscricao: new Date().toISOString().split('T')[0],
    data_validade: '',
    reason: '',
  });

  const load = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('assinaturas')
        .select('*')
        .eq('aluno_id', studentId)
        .order('data_validade', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      const sub = data
        ? { ...data, status: isDateActiveOrFuture(data.data_validade) ? 'Ativo' : 'Vencido' } as Subscription
        : null;
      setSubscription(sub);
      onPlanoChange?.(sub?.status === 'Ativo' ? sub.plano : null);
    } catch (e) {
      console.error('Erro ao carregar assinatura:', e);
    } finally {
      setLoading(false);
    }
  };

  const loadHistory = async () => {
    const { data } = await supabase
      .from('subscription_history')
      .select('*')
      .eq('aluno_id', studentId)
      .order('data_alteracao', { ascending: false })
      .limit(20);
    setHistory(data || []);
  };

  useEffect(() => { load(); }, [studentId]);

  const openEdit = () => {
    setEditForm({
      plano: subscription?.plano || '',
      data_inscricao: subscription?.data_inscricao || new Date().toISOString().split('T')[0],
      data_validade: subscription?.data_validade || '',
      reason: '',
    });
    setEditOpen(true);
  };

  const save = async () => {
    if (!editForm.plano || !editForm.data_validade) {
      toast({ title: 'Preencha plano e data de validade', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      if (subscription) {
        await supabase.from('assinaturas').update({
          plano: editForm.plano,
          data_inscricao: editForm.data_inscricao,
          data_validade: editForm.data_validade,
        }).eq('id', subscription.id);
        await supabase.from('subscription_history').insert({
          aluno_id: studentId,
          alteracao: `Assinatura atualizada: ${editForm.plano}, validade ${formatDateSafe(editForm.data_validade)}`,
          admin_responsavel: 'Administrador',
        });
        toast({ title: 'Assinatura atualizada' });
      } else {
        await supabase.from('assinaturas').insert({
          aluno_id: studentId,
          plano: editForm.plano,
          data_inscricao: editForm.data_inscricao,
          data_validade: editForm.data_validade,
        });
        await supabase.from('subscription_history').insert({
          aluno_id: studentId,
          alteracao: `Nova assinatura: ${editForm.plano}, validade ${formatDateSafe(editForm.data_validade)}`,
          admin_responsavel: 'Administrador',
        });
        toast({ title: 'Assinatura criada' });
      }
      setEditOpen(false);
      load();
    } catch (e) {
      console.error(e);
      toast({ title: 'Erro ao salvar', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const deleteSubscription = async () => {
    if (!subscription || !confirm('Excluir esta assinatura?')) return;
    await supabase.from('assinaturas').delete().eq('id', subscription.id);
    toast({ title: 'Assinatura excluída' });
    load();
  };

  if (loading) {
    return <div className="py-8 text-center text-sm text-muted-foreground">Carregando assinatura...</div>;
  }

  return (
    <div className="space-y-4">
      {/* Assinatura atual */}
      <div className="rounded-lg border p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Crown className="h-4 w-4 text-amber-500" />
            <span className="text-sm font-medium">Assinatura atual</span>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={openEdit}>
              {subscription ? <><Edit2 className="h-3 w-3 mr-1" />Editar</> : <><Plus className="h-3 w-3 mr-1" />Criar</>}
            </Button>
            {subscription && (
              <>
                <Button size="sm" variant="outline" onClick={async () => { await loadHistory(); setHistoryOpen(true); }}>
                  <History className="h-3 w-3 mr-1" />Histórico
                </Button>
                <Button size="sm" variant="outline" className="text-red-600 hover:text-red-700" onClick={deleteSubscription}>
                  <Trash2 className="h-3 w-3" />
                </Button>
              </>
            )}
          </div>
        </div>

        {subscription ? (
          <div className="grid grid-cols-3 gap-3 text-sm">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Plano</p>
              <Badge className={planoBadgeClass[subscription.plano]}>{subscription.plano}</Badge>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Validade</p>
              <p className="font-medium">{formatDateSafe(subscription.data_validade)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Status</p>
              <Badge className={subscription.status === 'Ativo' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                {subscription.status}
              </Badge>
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Nenhuma assinatura encontrada.</p>
        )}
      </div>

      {/* Dialog edição */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{subscription ? 'Editar' : 'Criar'} assinatura — {studentName}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Plano *</Label>
              <Select value={editForm.plano} onValueChange={(v: Plano) => setEditForm((p) => ({ ...p, plano: v }))}>
                <SelectTrigger><SelectValue placeholder="Selecione o plano" /></SelectTrigger>
                <SelectContent>
                  {PLANOS.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Data de Inscrição</Label>
                <Input type="date" value={editForm.data_inscricao}
                  onChange={(e) => setEditForm((p) => ({ ...p, data_inscricao: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Data de Validade *</Label>
                <Input type="date" value={editForm.data_validade}
                  onChange={(e) => setEditForm((p) => ({ ...p, data_validade: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Motivo (opcional)</Label>
              <Textarea rows={2} value={editForm.reason}
                onChange={(e) => setEditForm((p) => ({ ...p, reason: e.target.value }))}
                placeholder="Descreva o motivo da alteração..." />
            </div>
            <div className="flex gap-2">
              <Button onClick={save} disabled={saving || !editForm.plano || !editForm.data_validade} className="flex-1">
                {saving ? 'Salvando...' : subscription ? 'Atualizar' : 'Criar'}
              </Button>
              <Button variant="outline" onClick={() => setEditOpen(false)}>Cancelar</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog histórico */}
      <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Histórico — {studentName}</DialogTitle>
          </DialogHeader>
          <div className="max-h-80 overflow-y-auto">
            {history.length === 0 ? (
              <p className="text-center text-muted-foreground py-4 text-sm">Nenhum histórico encontrado.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Alteração</TableHead>
                    <TableHead>Responsável</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {history.map((h) => (
                    <TableRow key={h.id}>
                      <TableCell className="text-xs">{formatDateTimeSafe(h.data_alteracao)}</TableCell>
                      <TableCell className="text-xs">{h.alteracao}</TableCell>
                      <TableCell><Badge variant="outline" className="text-xs">{h.admin_responsavel}</Badge></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
