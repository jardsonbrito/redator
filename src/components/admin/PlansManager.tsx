import { useState } from 'react';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  usePlanos,
  useFuncionalidades,
  usePlanoFeatures,
  useVisitanteFeatures,
  usePlansAdminMutations,
  PlanoAdmin,
  FuncionalidadeAdmin,
} from '@/hooks/usePlansAdmin';
import {
  GripVertical,
  MoreVertical,
  Plus,
  Copy,
  Pencil,
  Power,
  PowerOff,
  Save,
  Users,
  AlertCircle,
  ChevronRight,
  Loader2,
} from 'lucide-react';

// ── SortablePlanItem ─────────────────────────────────────────────────────────

interface SortablePlanItemProps {
  plano: PlanoAdmin;
  isSelected: boolean;
  onSelect: () => void;
  onEdit: () => void;
  onDuplicate: () => void;
  onToggleActive: () => void;
}

const SortablePlanItem = ({
  plano, isSelected, onSelect, onEdit, onDuplicate, onToggleActive,
}: SortablePlanItemProps) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: plano.id });

  const [dropdownOpen, setDropdownOpen] = useState(false);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-colors ${
        isSelected
          ? 'border-primary bg-primary/5'
          : 'border-border bg-card hover:bg-muted/40'
      }`}
      onClick={onSelect}
    >
      <button
        className="text-muted-foreground hover:text-foreground cursor-grab active:cursor-grabbing touch-none"
        {...attributes}
        {...listeners}
        onClick={e => e.stopPropagation()}
      >
        <GripVertical className="w-4 h-4" />
      </button>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{plano.nome_exibicao}</p>
        <p className="text-xs text-muted-foreground truncate">{plano.nome}</p>
      </div>

      <Badge variant={plano.ativo ? 'default' : 'secondary'} className="text-xs shrink-0">
        {plano.ativo ? 'Ativo' : 'Inativo'}
      </Badge>

      {isSelected && <ChevronRight className="w-4 h-4 text-primary shrink-0" />}

      <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
        <DropdownMenuTrigger asChild>
          <button
            className="text-muted-foreground hover:text-foreground"
            onClick={e => e.stopPropagation()}
          >
            <MoreVertical className="w-4 h-4" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" onCloseAutoFocus={e => e.preventDefault()}>
          <DropdownMenuItem onClick={() => {
            setDropdownOpen(false);
            setTimeout(onEdit, 100);
          }}>
            <Pencil className="w-4 h-4 mr-2" /> Editar
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => {
            setDropdownOpen(false);
            setTimeout(onDuplicate, 100);
          }}>
            <Copy className="w-4 h-4 mr-2" /> Duplicar
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className={plano.ativo ? 'text-destructive' : 'text-green-600'}
            onClick={() => {
              setDropdownOpen(false);
              setTimeout(onToggleActive, 100);
            }}
          >
            {plano.ativo
              ? <><PowerOff className="w-4 h-4 mr-2" /> Desativar</>
              : <><Power className="w-4 h-4 mr-2" /> Ativar</>
            }
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};

// ── SortableFeatureItem ───────────────────────────────────────────────────────

interface SortableFeatureItemProps {
  func: FuncionalidadeAdmin;
  enabled: boolean;
  isSaving: boolean;
  onToggle: (habilitado: boolean) => void;
}

const SortableFeatureItem = ({ func, enabled, isSaving, onToggle }: SortableFeatureItemProps) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: func.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  if (func.sempre_disponivel) {
    return (
      <div
        ref={setNodeRef}
        style={style}
        className="flex items-center gap-3 px-3 py-2 rounded-md bg-muted/30 border border-dashed border-muted-foreground/30"
      >
        <button
          className="text-muted-foreground/50 hover:text-muted-foreground cursor-grab active:cursor-grabbing touch-none shrink-0"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="w-4 h-4" />
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-sm text-muted-foreground truncate">{func.nome_exibicao}</p>
        </div>
        <Badge variant="outline" className="text-xs text-muted-foreground">Sempre ativo</Badge>
      </div>
    );
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-3 px-3 py-2 rounded-md border border-border bg-card hover:bg-muted/20 transition-colors"
    >
      <button
        className="text-muted-foreground hover:text-foreground cursor-grab active:cursor-grabbing touch-none shrink-0"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="w-4 h-4" />
      </button>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{func.nome_exibicao}</p>
        <p className="text-xs text-muted-foreground font-mono">{func.chave}</p>
      </div>

      {isSaving
        ? <Loader2 className="w-4 h-4 animate-spin text-muted-foreground shrink-0" />
        : (
          <Switch
            checked={enabled}
            onCheckedChange={onToggle}
            className="shrink-0"
          />
        )
      }
    </div>
  );
};

// ── PlansManager (main) ───────────────────────────────────────────────────────

export const PlansManager = () => {
  const { data: planos = [], isLoading: loadingPlanos } = usePlanos();
  const { data: funcionalidades = [], isLoading: loadingFuncs } = useFuncionalidades();
  const mut = usePlansAdminMutations();

  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const selectedPlan = planos.find(p => p.id === selectedPlanId) ?? null;

  const { data: planFeatures = {} } = usePlanoFeatures(selectedPlanId);
  const { data: visitanteFeatures = {} } = useVisitanteFeatures();

  // Estado local da ordem de features (para o botão "Salvar Ordem")
  const [localFuncOrder, setLocalFuncOrder] = useState<FuncionalidadeAdmin[] | null>(null);
  const displayFuncs = localFuncOrder ?? funcionalidades;
  const hasUnsavedOrder = localFuncOrder !== null;

  // Estado local do visitante (para o botão "Salvar Visitante")
  const [localVisitante, setLocalVisitante] = useState<Record<string, boolean> | null>(null);
  const displayVisitante = localVisitante ?? visitanteFeatures;

  // Drag state para overlay
  const [activeDragId, setActiveDragId] = useState<string | null>(null);

  // Dialogs
  const [createDialog, setCreateDialog]     = useState(false);
  const [editDialog, setEditDialog]         = useState(false);
  const [duplicateDialog, setDuplicateDialog] = useState(false);
  const [deactivateAlert, setDeactivateAlert] = useState(false);
  const [activateAlert, setActivateAlert]   = useState(false);
  const [targetPlan, setTargetPlan]         = useState<PlanoAdmin | null>(null);

  // Form state
  const [formNome, setFormNome]             = useState('');
  const [formNomeExibicao, setFormNomeExibicao] = useState('');
  const [formDescricao, setFormDescricao]   = useState('');
  const [formCopiarDe, setFormCopiarDe]     = useState<string | null>(null);

  // ── Sensors dnd-kit ──────────────────────────────────────────────────────

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor,   { activationConstraint: { delay: 200, tolerance: 5 } })
  );

  // ── Handlers: plan list drag ──────────────────────────────────────────────

  const handlePlanDragStart = (e: DragStartEvent) => setActiveDragId(String(e.active.id));

  const handlePlanDragEnd = (e: DragEndEvent) => {
    setActiveDragId(null);
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIdx = planos.findIndex(p => p.id === active.id);
    const newIdx = planos.findIndex(p => p.id === over.id);
    const reordered = arrayMove(planos, oldIdx, newIdx);
    mut.reorderPlanos.mutate(reordered.map(p => p.id));
  };

  // ── Handlers: feature drag ────────────────────────────────────────────────

  const handleFuncDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const src = displayFuncs;
    const oldIdx = src.findIndex(f => f.id === active.id);
    const newIdx = src.findIndex(f => f.id === over.id);
    setLocalFuncOrder(arrayMove(src, oldIdx, newIdx));
  };

  const handleSaveOrder = () => {
    if (!localFuncOrder) return;
    mut.reorderFuncionalidades.mutate(
      localFuncOrder.map(f => f.id),
      { onSuccess: () => setLocalFuncOrder(null) }
    );
  };

  // ── Handlers: feature toggle ──────────────────────────────────────────────

  const handleToggleFeature = (chave: string, habilitado: boolean) => {
    if (!selectedPlan) return;
    mut.toggleFeature.mutate({
      planoId: selectedPlan.id,
      planoNome: selectedPlan.nome,
      chave,
      habilitado,
    });
  };

  // ── Handlers: visitante ───────────────────────────────────────────────────

  const handleToggleVisitante = (chave: string, habilitado: boolean) => {
    setLocalVisitante(prev => ({
      ...(prev ?? visitanteFeatures),
      [chave]: habilitado,
    }));
  };

  const handleSaveVisitante = () => {
    if (!localVisitante) return;
    mut.saveVisitante.mutate(localVisitante, {
      onSuccess: () => setLocalVisitante(null),
    });
  };

  // ── Helpers: abrir dialogs sem conflito de focus trap ─────────────────────

  const openEdit = (plan: PlanoAdmin) => {
    setTargetPlan(plan);
    setFormNomeExibicao(plan.nome_exibicao);
    setFormDescricao(plan.descricao ?? '');
    setEditDialog(true);
  };

  const openDuplicate = (plan: PlanoAdmin) => {
    setTargetPlan(plan);
    setFormNomeExibicao(`${plan.nome_exibicao} (Cópia)`);
    setFormNome(`${plan.nome}_copia`);
    setDuplicateDialog(true);
  };

  const openToggleActive = (plan: PlanoAdmin) => {
    setTargetPlan(plan);
    if (plan.ativo) setDeactivateAlert(true);
    else setActivateAlert(true);
  };

  const openCreate = () => {
    setFormNome('');
    setFormNomeExibicao('');
    setFormDescricao('');
    setFormCopiarDe(null);
    setCreateDialog(true);
  };

  // ── Submit: create ────────────────────────────────────────────────────────

  const handleCreate = () => {
    if (!formNome.trim() || !formNomeExibicao.trim()) return;
    mut.createPlano.mutate(
      { nome: formNome.trim(), nome_exibicao: formNomeExibicao.trim(), descricao: formDescricao || undefined, copiar_de_id: formCopiarDe },
      { onSuccess: (novo) => {
          setCreateDialog(false);
          if (novo) setSelectedPlanId(novo.id);
        }
      }
    );
  };

  // ── Submit: edit ──────────────────────────────────────────────────────────

  const handleEdit = () => {
    if (!targetPlan || !formNomeExibicao.trim()) return;
    mut.updatePlano.mutate(
      { id: targetPlan.id, nome_exibicao: formNomeExibicao.trim(), descricao: formDescricao || undefined },
      { onSuccess: () => setEditDialog(false) }
    );
  };

  // ── Submit: duplicate ─────────────────────────────────────────────────────

  const handleDuplicate = () => {
    if (!targetPlan || !formNome.trim() || !formNomeExibicao.trim()) return;
    mut.createPlano.mutate(
      { nome: formNome.trim(), nome_exibicao: formNomeExibicao.trim(), copiar_de_id: targetPlan.id },
      { onSuccess: (novo) => {
          setDuplicateDialog(false);
          if (novo) setSelectedPlanId(novo.id);
        }
      }
    );
  };

  // ── Render ────────────────────────────────────────────────────────────────

  const isSavingToggle = mut.toggleFeature.isPending;
  const savingChave = mut.toggleFeature.variables?.chave ?? null;

  if (loadingPlanos || loadingFuncs) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Gestão de Planos</h2>
          <p className="text-sm text-muted-foreground">
            Configure planos, permissões de cards e acesso de visitante sem alterar código.
          </p>
        </div>
        <Button size="sm" onClick={openCreate}>
          <Plus className="w-4 h-4 mr-2" /> Novo Plano
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-4">

        {/* ── Coluna esquerda: lista de planos ──────────────────────────── */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
              Planos ({planos.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragStart={handlePlanDragStart}
              onDragEnd={handlePlanDragEnd}
            >
              <SortableContext items={planos.map(p => p.id)} strategy={verticalListSortingStrategy}>
                {planos.map(plano => (
                  <SortablePlanItem
                    key={plano.id}
                    plano={plano}
                    isSelected={selectedPlanId === plano.id}
                    onSelect={() => setSelectedPlanId(plano.id)}
                    onEdit={() => openEdit(plano)}
                    onDuplicate={() => openDuplicate(plano)}
                    onToggleActive={() => openToggleActive(plano)}
                  />
                ))}
              </SortableContext>
              <DragOverlay>
                {activeDragId && (() => {
                  const p = planos.find(x => x.id === activeDragId);
                  return p ? (
                    <div className="flex items-center gap-2 p-3 rounded-lg border border-primary bg-card shadow-lg">
                      <GripVertical className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm font-medium">{p.nome_exibicao}</span>
                    </div>
                  ) : null;
                })()}
              </DragOverlay>
            </DndContext>

            {planos.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                Nenhum plano cadastrado.
              </p>
            )}

            {/* Visitante como item separado na lista */}
            <div className="pt-1">
              <Separator className="mb-2" />
              <div
                className={`flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-colors ${
                  selectedPlanId === '__visitante__'
                    ? 'border-primary bg-primary/5'
                    : 'border-border bg-card hover:bg-muted/40'
                }`}
                onClick={() => setSelectedPlanId('__visitante__')}
              >
                <Users className="w-4 h-4 text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">Visitante</p>
                  <p className="text-xs text-muted-foreground">Acesso sem login</p>
                </div>
                {selectedPlanId === '__visitante__' && (
                  <ChevronRight className="w-4 h-4 text-primary shrink-0" />
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ── Coluna direita ─────────────────────────────────────────────── */}
        {selectedPlan ? (
          <div className="space-y-4">
            {/* Cabeçalho do plano */}
            <Card>
              <CardContent className="pt-4 pb-3">
                <div className="flex items-center gap-3 flex-wrap">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-base">{selectedPlan.nome_exibicao}</h3>
                    <p className="text-xs text-muted-foreground font-mono">chave interna: {selectedPlan.nome}</p>
                    {selectedPlan.descricao && (
                      <p className="text-sm text-muted-foreground mt-0.5">{selectedPlan.descricao}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant={selectedPlan.ativo ? 'default' : 'secondary'}>
                      {selectedPlan.ativo ? 'Ativo' : 'Inativo'}
                    </Badge>
                    <Button size="sm" variant="outline" onClick={() => openEdit(selectedPlan)}>
                      <Pencil className="w-3 h-3 mr-1" /> Editar
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => openDuplicate(selectedPlan)}>
                      <Copy className="w-3 h-3 mr-1" /> Duplicar
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Cards / funcionalidades do plano */}
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <CardTitle className="text-sm">Cards liberados neste plano</CardTitle>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Toggle salva imediatamente · Arraste para definir a ordem dos cards do aluno
                    </p>
                  </div>
                  {hasUnsavedOrder && (
                    <Button
                      size="sm"
                      onClick={handleSaveOrder}
                      disabled={mut.reorderFuncionalidades.isPending}
                    >
                      {mut.reorderFuncionalidades.isPending
                        ? <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        : <Save className="w-4 h-4 mr-2" />
                      }
                      Salvar Ordem
                    </Button>
                  )}
                </div>
                {hasUnsavedOrder && (
                  <div className="flex items-center gap-1.5 text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded px-2 py-1 mt-1">
                    <AlertCircle className="w-3 h-3 shrink-0" />
                    Nova ordem ainda não salva — clique em "Salvar Ordem" para confirmar
                  </div>
                )}
              </CardHeader>
              <CardContent>
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleFuncDragEnd}
                >
                  <SortableContext
                    items={displayFuncs.map(f => f.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <div className="space-y-1.5">
                      {displayFuncs.map(func => (
                        <SortableFeatureItem
                          key={func.id}
                          func={func}
                          enabled={func.sempre_disponivel ? true : (planFeatures[func.chave] ?? false)}
                          isSaving={isSavingToggle && savingChave === func.chave}
                          onToggle={(habilitado) => handleToggleFeature(func.chave, habilitado)}
                        />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
              </CardContent>
            </Card>
          </div>
        ) : selectedPlanId === '__visitante__' ? (
          /* ── Painel do Visitante ─────────────────────────────────────── */
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Users className="w-4 h-4" /> Acesso do Visitante
                  </CardTitle>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Configuração independente dos planos — válida para todos os visitantes sem login
                  </p>
                </div>
                <Button
                  size="sm"
                  onClick={handleSaveVisitante}
                  disabled={mut.saveVisitante.isPending || !localVisitante}
                  variant={localVisitante ? 'default' : 'outline'}
                >
                  {mut.saveVisitante.isPending
                    ? <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    : <Save className="w-4 h-4 mr-2" />
                  }
                  Salvar
                </Button>
              </div>
              {localVisitante && (
                <div className="flex items-center gap-1.5 text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded px-2 py-1 mt-1">
                  <AlertCircle className="w-3 h-3 shrink-0" />
                  Alterações ainda não salvas
                </div>
              )}
            </CardHeader>
            <CardContent>
              <div className="space-y-1.5">
                {funcionalidades.filter(f => !f.sempre_disponivel).map(func => (
                  <div
                    key={func.id}
                    className="flex items-center gap-3 px-3 py-2 rounded-md border border-border bg-card"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{func.nome_exibicao}</p>
                      <p className="text-xs text-muted-foreground font-mono">{func.chave}</p>
                    </div>
                    <Switch
                      checked={displayVisitante[func.chave] ?? false}
                      onCheckedChange={(v) => handleToggleVisitante(func.chave, v)}
                    />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="flex items-center justify-center min-h-[300px]">
            <div className="text-center text-muted-foreground">
              <ChevronRight className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">Selecione um plano para configurar</p>
            </div>
          </Card>
        )}
      </div>

      {/* ── Dialog: Criar Plano ─────────────────────────────────────────── */}
      <Dialog open={createDialog} onOpenChange={setCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo Plano</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label htmlFor="create-nome">Chave interna <span className="text-muted-foreground text-xs">(única, usada nos dados)</span></Label>
              <Input
                id="create-nome"
                placeholder="Ex: Avancado"
                value={formNome}
                onChange={e => setFormNome(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="create-exibicao">Nome de exibição</Label>
              <Input
                id="create-exibicao"
                placeholder="Ex: Avançado"
                value={formNomeExibicao}
                onChange={e => setFormNomeExibicao(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="create-desc">Descrição <span className="text-muted-foreground text-xs">(opcional)</span></Label>
              <Textarea
                id="create-desc"
                placeholder="Descreva o plano..."
                value={formDescricao}
                onChange={e => setFormDescricao(e.target.value)}
                rows={2}
              />
            </div>
            <div>
              <Label>Copiar permissões de</Label>
              <div className="flex flex-wrap gap-2 mt-1.5">
                <button
                  type="button"
                  onClick={() => setFormCopiarDe(null)}
                  className={`px-3 py-1 text-xs rounded-full border transition-colors ${
                    formCopiarDe === null ? 'bg-primary text-primary-foreground border-primary' : 'border-border hover:bg-muted'
                  }`}
                >
                  Nenhum (tudo bloqueado)
                </button>
                {planos.filter(p => p.ativo).map(p => (
                  <button
                    type="button"
                    key={p.id}
                    onClick={() => setFormCopiarDe(p.id)}
                    className={`px-3 py-1 text-xs rounded-full border transition-colors ${
                      formCopiarDe === p.id ? 'bg-primary text-primary-foreground border-primary' : 'border-border hover:bg-muted'
                    }`}
                  >
                    {p.nome_exibicao}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialog(false)}>Cancelar</Button>
            <Button
              onClick={handleCreate}
              disabled={!formNome.trim() || !formNomeExibicao.trim() || mut.createPlano.isPending}
            >
              {mut.createPlano.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Criar Plano
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Dialog: Editar Plano ────────────────────────────────────────── */}
      <Dialog open={editDialog} onOpenChange={setEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Plano</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {targetPlan && (
              <div className="text-xs text-muted-foreground bg-muted/50 rounded px-3 py-2">
                Chave interna (imutável): <span className="font-mono font-medium">{targetPlan.nome}</span>
              </div>
            )}
            <div>
              <Label htmlFor="edit-exibicao">Nome de exibição</Label>
              <Input
                id="edit-exibicao"
                value={formNomeExibicao}
                onChange={e => setFormNomeExibicao(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="edit-desc">Descrição</Label>
              <Textarea
                id="edit-desc"
                value={formDescricao}
                onChange={e => setFormDescricao(e.target.value)}
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialog(false)}>Cancelar</Button>
            <Button
              onClick={handleEdit}
              disabled={!formNomeExibicao.trim() || mut.updatePlano.isPending}
            >
              {mut.updatePlano.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Dialog: Duplicar Plano ──────────────────────────────────────── */}
      <Dialog open={duplicateDialog} onOpenChange={setDuplicateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Duplicar Plano</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {targetPlan && (
              <p className="text-sm text-muted-foreground">
                Copiando permissões de <strong>{targetPlan.nome_exibicao}</strong>
              </p>
            )}
            <div>
              <Label htmlFor="dup-nome">Chave interna do novo plano</Label>
              <Input
                id="dup-nome"
                value={formNome}
                onChange={e => setFormNome(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="dup-exibicao">Nome de exibição</Label>
              <Input
                id="dup-exibicao"
                value={formNomeExibicao}
                onChange={e => setFormNomeExibicao(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDuplicateDialog(false)}>Cancelar</Button>
            <Button
              onClick={handleDuplicate}
              disabled={!formNome.trim() || !formNomeExibicao.trim() || mut.createPlano.isPending}
            >
              {mut.createPlano.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Duplicar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── AlertDialog: Desativar ──────────────────────────────────────── */}
      <AlertDialog open={deactivateAlert} onOpenChange={setDeactivateAlert}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Desativar plano?</AlertDialogTitle>
            <AlertDialogDescription>
              O plano <strong>{targetPlan?.nome_exibicao}</strong> ficará inativo. Alunos com assinaturas
              existentes não serão afetados, mas novas assinaturas não poderão usar este plano.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={() => targetPlan && mut.togglePlanActive.mutate({ id: targetPlan.id, ativo: false })}
            >
              Desativar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── AlertDialog: Ativar ─────────────────────────────────────────── */}
      <AlertDialog open={activateAlert} onOpenChange={setActivateAlert}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Ativar plano?</AlertDialogTitle>
            <AlertDialogDescription>
              O plano <strong>{targetPlan?.nome_exibicao}</strong> voltará a estar disponível para novas assinaturas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => targetPlan && mut.togglePlanActive.mutate({ id: targetPlan.id, ativo: true })}
            >
              Ativar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
