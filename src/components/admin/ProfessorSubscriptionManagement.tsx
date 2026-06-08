import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Crown, Edit2, History, MoreVertical, Trash2, Search } from 'lucide-react';
import { formatDateSafe, isDateActiveOrFuture, formatDateTimeSafe } from '@/utils/dateUtils';
import { usePlanos } from '@/hooks/usePlansAdmin';

interface Professor {
  id: string;
  nome_completo: string;
  email: string;
  ativo: boolean;
  jarvis_correcao_creditos: number | null;
}

interface ProfessorAssinatura {
  id: string;
  professor_id: string;
  plano: string;
  data_inscricao: string;
  data_validade: string;
  creditos: number;
  status: 'Ativo' | 'Vencido';
  observacao: string | null;
}

interface SubscriptionHistory {
  id: string;
  professor_id: string;
  alteracao: string;
  data_alteracao: string;
  admin_responsavel: string;
}

const STATUS_OPTIONS = [
  { value: 'ativo', label: 'Ativo' },
  { value: 'inativo', label: 'Inativo' },
  { value: 'suspenso', label: 'Suspenso' },
  { value: 'cancelado', label: 'Cancelado' },
];

export const ProfessorSubscriptionManagement = () => {
  const { data: todosPlanos = [] } = usePlanos();
  const planosProf = todosPlanos.filter(p => p.ativo && p.tipo === 'professor');
  const queryClient = useQueryClient();

  const [busca, setBusca] = useState('');
  const [selectedProfessor, setSelectedProfessor] = useState<Professor | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
  const [historyProfessor, setHistoryProfessor] = useState<Professor | null>(null);
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);

  const [editForm, setEditForm] = useState({
    plano: '',
    data_inscricao: new Date().toISOString().split('T')[0],
    data_validade: '',
    creditos: '0',
    status: 'ativo',
    observacao: '',
  });

  const { data: professores = [], isLoading: loadingProfessores } = useQuery<Professor[]>({
    queryKey: ['professores-lista-assinatura'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('professores')
        .select('id, nome_completo, email, ativo, jarvis_correcao_creditos')
        .order('nome_completo');
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: assinaturas = [], isLoading: loadingAssinaturas } = useQuery<ProfessorAssinatura[]>({
    queryKey: ['professor-assinaturas-all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('professor_assinaturas')
        .select('*')
        .order('data_validade', { ascending: false });
      if (error) throw error;
      return (data ?? []).map(s => ({
        ...s,
        status: isDateActiveOrFuture(s.data_validade) ? 'Ativo' : 'Vencido',
      })) as ProfessorAssinatura[];
    },
  });

  const { data: history = [] } = useQuery<SubscriptionHistory[]>({
    queryKey: ['professor-subscription-history', historyProfessor?.id],
    enabled: !!historyProfessor,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('professor_subscription_history')
        .select('*')
        .eq('professor_id', historyProfessor!.id)
        .order('data_alteracao', { ascending: false })
        .limit(20);
      if (error) throw error;
      return data ?? [];
    },
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['professor-assinaturas-all'] });
    queryClient.invalidateQueries({ queryKey: ['professor-subscription', selectedProfessor?.id] });
    queryClient.invalidateQueries({ queryKey: ['professores-lista-assinatura'] });
    queryClient.invalidateQueries({ queryKey: ['professores-jarvis-creditos'] });
  };

  const saveMutation = useMutation({
    mutationFn: async (prof: Professor) => {
      if (!editForm.plano || !editForm.data_validade) throw new Error('Preencha todos os campos obrigatórios');
      const existing = assinaturas.find(a => a.professor_id === prof.id);

      if (existing) {
        const { error } = await supabase
          .from('professor_assinaturas')
          .update({
            plano: editForm.plano,
            data_inscricao: editForm.data_inscricao,
            data_validade: editForm.data_validade,
            creditos: parseInt(editForm.creditos) || 0,
            status: editForm.status,
            observacao: editForm.observacao || null,
            atualizado_em: new Date().toISOString(),
          })
          .eq('id', existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('professor_assinaturas')
          .insert({
            professor_id: prof.id,
            plano: editForm.plano,
            data_inscricao: editForm.data_inscricao,
            data_validade: editForm.data_validade,
            creditos: parseInt(editForm.creditos) || 0,
            status: editForm.status,
            observacao: editForm.observacao || null,
          });
        if (error) throw error;
      }

      const { error: errCreditos } = await supabase
        .from('professores')
        .update({ jarvis_correcao_creditos: parseInt(editForm.creditos) || 0 })
        .eq('id', prof.id);
      if (errCreditos) throw errCreditos;

      await supabase.from('professor_subscription_history').insert({
        professor_id: prof.id,
        alteracao: `Assinatura ${existing ? 'atualizada' : 'criada'}: ${getPlanoExibicao(editForm.plano)}, validade ${formatDateSafe(editForm.data_validade)}, créditos ${editForm.creditos}`,
        admin_responsavel: 'Administrador',
      });
    },
    onSuccess: () => {
      toast.success('Assinatura salva com sucesso');
      setEditDialogOpen(false);
      setSelectedProfessor(null);
      invalidate();
    },
    onError: (err: Error) => toast.error(err.message || 'Erro ao salvar assinatura'),
  });

  const deleteMutation = useMutation({
    mutationFn: async (assinaturaId: string) => {
      const { error } = await supabase
        .from('professor_assinaturas')
        .delete()
        .eq('id', assinaturaId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Assinatura excluída');
      invalidate();
    },
    onError: () => toast.error('Erro ao excluir assinatura'),
  });

  const getProfAssinatura = (profId: string) => assinaturas.find(a => a.professor_id === profId);

  const openEdit = (prof: Professor) => {
    const existing = getProfAssinatura(prof.id);
    setSelectedProfessor(prof);
    setEditForm({
      plano: existing?.plano || '',
      data_inscricao: existing?.data_inscricao || new Date().toISOString().split('T')[0],
      data_validade: existing?.data_validade || '',
      creditos: String(prof.jarvis_correcao_creditos ?? existing?.creditos ?? 0),
      status: existing ? (isDateActiveOrFuture(existing.data_validade) ? 'ativo' : 'expirado') : 'ativo',
      observacao: existing?.observacao || '',
    });
    setEditDialogOpen(true);
  };

  const openHistory = (prof: Professor) => {
    setHistoryProfessor(prof);
    setHistoryDialogOpen(true);
  };

  const getStatusBadge = (status: string) =>
    status === 'Ativo'
      ? <Badge className="bg-green-100 text-green-800">Ativo</Badge>
      : <Badge variant="destructive">Vencido</Badge>;

  const getPlanoExibicao = (plano: string) =>
    todosPlanos.find(p => p.nome === plano)?.nome_exibicao ?? plano;

  const getPlanoBadge = (plano: string) => (
    <Badge className="bg-violet-100 text-violet-800">{getPlanoExibicao(plano)}</Badge>
  );

  const professoresFiltrados = professores.filter(p =>
    busca === '' ||
    p.nome_completo.toLowerCase().includes(busca.toLowerCase()) ||
    p.email.toLowerCase().includes(busca.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Crown className="h-5 w-5" />
            Assinaturas de Professores
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome ou e-mail..."
              value={busca}
              onChange={e => setBusca(e.target.value)}
              className="pl-9"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            Professores ({professoresFiltrados.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loadingProfessores || loadingAssinaturas ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
              <p className="mt-2 text-muted-foreground">Carregando...</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>E-mail</TableHead>
                  <TableHead>Plano</TableHead>
                  <TableHead>Créditos</TableHead>
                  <TableHead>Validade</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {professoresFiltrados.map(prof => {
                  const assinatura = getProfAssinatura(prof.id);
                  return (
                    <TableRow key={prof.id}>
                      <TableCell className="font-medium">{prof.nome_completo}</TableCell>
                      <TableCell className="text-muted-foreground">{prof.email}</TableCell>
                      <TableCell>
                        {assinatura
                          ? getPlanoBadge(assinatura.plano)
                          : <Badge variant="outline">Sem assinatura</Badge>
                        }
                      </TableCell>
                      <TableCell>
                        {prof.jarvis_correcao_creditos != null ? (
                          <Badge variant="outline" className="font-semibold">
                            {prof.jarvis_correcao_creditos}
                          </Badge>
                        ) : '-'}
                      </TableCell>
                      <TableCell>
                        {assinatura ? formatDateSafe(assinatura.data_validade) : '-'}
                      </TableCell>
                      <TableCell>
                        {assinatura
                          ? getStatusBadge(assinatura.status)
                          : <Badge variant="outline">Inativo</Badge>
                        }
                      </TableCell>
                      <TableCell>
                        <DropdownMenu
                          open={openDropdownId === prof.id}
                          onOpenChange={open => setOpenDropdownId(open ? prof.id : null)}
                        >
                          <DropdownMenuTrigger asChild>
                            <Button size="sm" variant="outline">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => {
                              setOpenDropdownId(null);
                              setTimeout(() => openEdit(prof), 100);
                            }}>
                              <Edit2 className="h-4 w-4 mr-2" />
                              {assinatura ? 'Editar' : 'Criar'} assinatura
                            </DropdownMenuItem>
                            {assinatura && (
                              <DropdownMenuItem
                                className="text-red-600"
                                onClick={() => {
                                  setOpenDropdownId(null);
                                  deleteMutation.mutate(assinatura.id);
                                }}
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Excluir assinatura
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem onClick={() => {
                              setOpenDropdownId(null);
                              setTimeout(() => openHistory(prof), 100);
                            }}>
                              <History className="h-4 w-4 mr-2" />
                              Histórico
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}

          {!loadingProfessores && professoresFiltrados.length === 0 && (
            <p className="text-center text-muted-foreground py-8">
              Nenhum professor encontrado.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Dialog de Edição */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {getProfAssinatura(selectedProfessor?.id ?? '') ? 'Editar' : 'Criar'} Assinatura
              {selectedProfessor && ` — ${selectedProfessor.nome_completo}`}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Plano *</Label>
              <Select
                value={editForm.plano}
                onValueChange={v => setEditForm(p => ({ ...p, plano: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o plano" />
                </SelectTrigger>
                <SelectContent>
                  {planosProf.length > 0 ? (
                    planosProf.map(p => (
                      <SelectItem key={p.nome} value={p.nome}>
                        {p.nome_exibicao}
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="__none__" disabled>
                      Nenhum plano de professor cadastrado
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
              {planosProf.length === 0 && (
                <p className="text-xs text-amber-600">
                  Crie um plano do tipo "Professor" na aba Planos para poder selecioná-lo aqui.
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Data de Inscrição</Label>
                <Input
                  type="date"
                  value={editForm.data_inscricao}
                  onChange={e => setEditForm(p => ({ ...p, data_inscricao: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Data de Validade *</Label>
                <Input
                  type="date"
                  value={editForm.data_validade}
                  onChange={e => setEditForm(p => ({ ...p, data_validade: e.target.value }))}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Créditos</Label>
                <Input
                  type="number"
                  min="0"
                  value={editForm.creditos}
                  onChange={e => setEditForm(p => ({ ...p, creditos: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={editForm.status}
                  onValueChange={v => setEditForm(p => ({ ...p, status: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map(s => (
                      <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Observação (opcional)</Label>
              <Textarea
                value={editForm.observacao}
                onChange={e => setEditForm(p => ({ ...p, observacao: e.target.value }))}
                placeholder="Observação administrativa..."
                rows={2}
              />
            </div>

            <div className="flex gap-2">
              <Button
                className="flex-1"
                onClick={() => selectedProfessor && saveMutation.mutate(selectedProfessor)}
                disabled={saveMutation.isPending || !editForm.plano || !editForm.data_validade}
              >
                {saveMutation.isPending ? 'Salvando...' : 'Salvar'}
              </Button>
              <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
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
            <DialogTitle>Histórico — {historyProfessor?.nome_completo}</DialogTitle>
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
                {history.map(h => (
                  <TableRow key={h.id}>
                    <TableCell>{formatDateTimeSafe(h.data_alteracao)}</TableCell>
                    <TableCell>{h.alteracao}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{h.admin_responsavel}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {history.length === 0 && (
              <p className="text-center text-muted-foreground py-4">Nenhum histórico encontrado.</p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
