import { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { StudentLoginActivityModal } from '@/components/admin/StudentLoginActivityModal';
import { StudentSubscriptionSection } from './StudentSubscriptionSection';
import { StudentPlanSection } from './StudentPlanSection';
import { StudentCreditSection } from './StudentCreditSection';
import { TURMAS_VALIDAS, formatTurmaDisplay, normalizeTurmaToLetter } from '@/utils/turmaUtils';
import { Activity, Edit2, Save, X, MoveRight, BellOff } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { MigrarVisitanteModal } from '@/components/admin/MigrarVisitanteModal';

export interface AlunoHubItem {
  id: string;
  nome: string;
  email: string;
  turma: string;
  ativo: boolean;
  tipo?: 'aluno' | 'visitante';
  session_id?: string;
  created_at?: string;
  temPlanoAtivo?: boolean;
}

interface AlunoPerfilSheetProps {
  aluno: AlunoHubItem | null;
  isOpen: boolean;
  onClose: () => void;
  onRefresh: () => void;
}

export function AlunoPerfilSheet({ aluno, isOpen, onClose, onRefresh }: AlunoPerfilSheetProps) {
  const { toast } = useToast();
  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({ nome: '', email: '', turma: '' });
  const [planoAtivo, setPlanoAtivo] = useState<'Liderança' | 'Lapidação' | 'Largada' | 'Bolsista' | null>(null);
  const [migrarOpen, setMigrarOpen] = useState(false);
  const [activityOpen, setActivityOpen] = useState(false);
  const [dispensarNotif, setDispensarNotif] = useState(false);
  const [loadingDispensa, setLoadingDispensa] = useState(false);

  const isVisitante = aluno?.tipo === 'visitante';

  useEffect(() => {
    if (aluno) {
      setFormData({
        nome: aluno.nome || '',
        email: aluno.email || '',
        turma: normalizeTurmaToLetter(aluno.turma) || '',
      });
      setEditMode(false);
      // Carregar configuração de dispensa de notificação
      if (aluno.tipo !== 'visitante') {
        supabase
          .from('profiles')
          .select('dispensar_notif_frequencia')
          .eq('id', aluno.id)
          .single()
          .then(({ data }) => {
            setDispensarNotif(data?.dispensar_notif_frequencia ?? false);
          });
      }
    }
  }, [aluno?.id]);

  const toggleDispensarNotif = async () => {
    setLoadingDispensa(true);
    const novoValor = !dispensarNotif;
    const { error } = await supabase
      .from('profiles')
      .update({ dispensar_notif_frequencia: novoValor })
      .eq('id', aluno!.id);
    if (error) {
      toast({ title: 'Erro ao atualizar configuração', variant: 'destructive' });
    } else {
      setDispensarNotif(novoValor);
      toast({ title: novoValor ? 'Notificações de falta desativadas' : 'Notificações de falta reativadas' });
    }
    setLoadingDispensa(false);
  };

  if (!aluno) return null;

  const handleSave = async () => {
    if (!formData.nome.trim() || !formData.email.trim() || !formData.turma) {
      toast({ title: 'Preencha todos os campos', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          nome: formData.nome.trim(),
          email: formData.email.trim().toLowerCase(),
          turma: formData.turma,
        })
        .eq('id', aluno.id);
      if (error) throw error;
      toast({ title: 'Dados atualizados com sucesso' });
      setEditMode(false);
      onRefresh();
    } catch (e: any) {
      toast({ title: 'Erro ao salvar', description: e.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const toggleAtivo = async () => {
    const { error } = await supabase
      .from('profiles')
      .update({ ativo: !aluno.ativo })
      .eq('id', aluno.id);
    if (error) { toast({ title: 'Erro ao alterar status', variant: 'destructive' }); return; }
    toast({ title: aluno.ativo ? 'Aluno desativado' : 'Aluno ativado' });
    onRefresh();
  };

  return (
    <>
      <Sheet open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
        <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
          <SheetHeader className="pb-4 border-b">
            <div className="flex items-start justify-between gap-3">
              <div>
                <SheetTitle className="text-base font-semibold">{aluno.nome}</SheetTitle>
                <p className="text-xs text-muted-foreground mt-0.5">{aluno.email}</p>
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  {isVisitante ? (
                    <Badge variant="outline" className="text-xs">Visitante</Badge>
                  ) : (
                    <>
                      <Badge variant="outline" className="text-xs">{aluno.turma}</Badge>
                      <Badge
                        variant={aluno.ativo ? 'default' : 'secondary'}
                        className={`text-xs cursor-pointer ${aluno.ativo ? 'bg-green-100 text-green-800 hover:bg-green-200' : ''}`}
                        onClick={toggleAtivo}
                      >
                        {aluno.ativo ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </>
                  )}
                </div>
              </div>
              {isVisitante && (
                <Button size="sm" variant="outline" onClick={() => setMigrarOpen(true)}>
                  <MoveRight className="h-3 w-3 mr-1" />
                  Migrar para aluno
                </Button>
              )}
            </div>
          </SheetHeader>

          <Tabs defaultValue="dados" className="mt-4">
            <TabsList>
              <TabsTrigger value="dados">Dados</TabsTrigger>
              <TabsTrigger value="assinatura" disabled={isVisitante}>Plano</TabsTrigger>
              <TabsTrigger value="creditos" disabled={isVisitante}>Créditos</TabsTrigger>
              <TabsTrigger value="funcionalidades" disabled={isVisitante}>Funções</TabsTrigger>
              <TabsTrigger value="atividade" disabled={isVisitante}>Atividade</TabsTrigger>
            </TabsList>

            {/* Aba: Dados básicos */}
            <TabsContent value="dados" className="mt-4 space-y-4">
              {!isVisitante && (
                <>
                  <div className="flex justify-end">
                    {editMode ? (
                      <div className="flex gap-2">
                        <Button size="sm" onClick={handleSave} disabled={saving}>
                          <Save className="h-3 w-3 mr-1" />{saving ? 'Salvando...' : 'Salvar'}
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => setEditMode(false)}>
                          <X className="h-3 w-3 mr-1" />Cancelar
                        </Button>
                      </div>
                    ) : (
                      <Button size="sm" variant="outline" onClick={() => setEditMode(true)}>
                        <Edit2 className="h-3 w-3 mr-1" />Editar
                      </Button>
                    )}
                  </div>

                  <div className="space-y-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Nome</Label>
                      {editMode ? (
                        <Input value={formData.nome} onChange={(e) => setFormData((p) => ({ ...p, nome: e.target.value }))} />
                      ) : (
                        <p className="text-sm border rounded-md px-3 py-2 bg-muted/30">{aluno.nome}</p>
                      )}
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Email</Label>
                      {editMode ? (
                        <Input type="email" value={formData.email} onChange={(e) => setFormData((p) => ({ ...p, email: e.target.value }))} />
                      ) : (
                        <p className="text-sm border rounded-md px-3 py-2 bg-muted/30">{aluno.email}</p>
                      )}
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Turma</Label>
                      {editMode ? (
                        <Select value={formData.turma} onValueChange={(v) => setFormData((p) => ({ ...p, turma: v }))}>
                          <SelectTrigger><SelectValue placeholder="Selecione a turma" /></SelectTrigger>
                          <SelectContent>
                            {TURMAS_VALIDAS.map((t) => (
                              <SelectItem key={t} value={t}>{formatTurmaDisplay(t)}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <p className="text-sm border rounded-md px-3 py-2 bg-muted/30">{aluno.turma}</p>
                      )}
                    </div>
                  </div>

                  <div className="pt-2 border-t">
                    <p className="text-xs text-muted-foreground mb-1">Cadastrado em</p>
                    <p className="text-sm">{aluno.created_at ? new Date(aluno.created_at).toLocaleDateString('pt-BR') : '—'}</p>
                  </div>

                  <div className="pt-2 border-t flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <BellOff className="h-3.5 w-3.5 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">Dispensar notificações de falta</p>
                        <p className="text-xs text-muted-foreground">Aluno não receberá mensagens de justificativa de ausência</p>
                      </div>
                    </div>
                    <Switch
                      checked={dispensarNotif}
                      onCheckedChange={toggleDispensarNotif}
                      disabled={loadingDispensa}
                    />
                  </div>
                </>
              )}

              {isVisitante && (
                <div className="space-y-3 text-sm">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-xs text-muted-foreground">Nome</p>
                      <p className="font-medium">{aluno.nome}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Email</p>
                      <p className="font-medium">{aluno.email}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Session ID</p>
                      <p className="font-mono text-xs break-all">{aluno.session_id || '—'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Primeiro acesso</p>
                      <p>{aluno.created_at ? new Date(aluno.created_at).toLocaleDateString('pt-BR') : '—'}</p>
                    </div>
                  </div>
                  <div className="bg-amber-50 border border-amber-200 rounded p-3 text-xs text-amber-800">
                    Visitantes não possuem plano ou acesso ao painel. Use "Migrar para aluno" para convertê-lo.
                  </div>
                </div>
              )}
            </TabsContent>

            {/* Aba: Assinatura */}
            <TabsContent value="assinatura" className="mt-4">
              {!isVisitante && (
                <StudentSubscriptionSection
                  studentId={aluno.id}
                  studentName={aluno.nome}
                  onPlanoChange={setPlanoAtivo}
                />
              )}
            </TabsContent>

            {/* Aba: Créditos */}
            <TabsContent value="creditos" className="mt-4">
              {!isVisitante && (
                <StudentCreditSection studentId={aluno.id} studentName={aluno.nome} />
              )}
            </TabsContent>

            {/* Aba: Funcionalidades */}
            <TabsContent value="funcionalidades" className="mt-4">
              {!isVisitante && (
                <StudentPlanSection studentId={aluno.id} plano={planoAtivo} />
              )}
            </TabsContent>

            {/* Aba: Atividade */}
            <TabsContent value="atividade" className="mt-4">
              {!isVisitante && (
                <>
                  <Button size="sm" variant="outline" onClick={() => setActivityOpen(true)}>
                    <Activity className="h-3 w-3 mr-1" />
                    Ver histórico de acesso
                  </Button>
                  <p className="text-xs text-muted-foreground mt-2">
                    Visualiza os últimos 30 dias de logins e sessões do aluno.
                  </p>
                </>
              )}
            </TabsContent>
          </Tabs>
        </SheetContent>
      </Sheet>

      {/* Modal de atividade de login (abre separado para não conflitar com o Sheet) */}
      {activityOpen && (
        <StudentLoginActivityModal
          studentEmail={aluno.email}
          studentName={aluno.nome}
          isOpen={activityOpen}
          onClose={() => setActivityOpen(false)}
        />
      )}

      {/* Modal de migração de visitante */}
      {migrarOpen && aluno && (
        <MigrarVisitanteModal
          visitante={aluno as any}
          isOpen={migrarOpen}
          onClose={() => setMigrarOpen(false)}
          onSuccess={() => { setMigrarOpen(false); onClose(); onRefresh(); }}
        />
      )}
    </>
  );
}
