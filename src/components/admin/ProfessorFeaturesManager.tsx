import { useState } from 'react';
import {
  DndContext,
  DragEndEvent,
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
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { GripVertical, Save, AlertCircle, Loader2 } from 'lucide-react';
import {
  useProfessorFuncionalidadesAdmin,
  useProfessorFeaturesAdminMutations,
  ProfessorFuncionalidadeAdmin,
} from '@/hooks/useProfessorFeaturesAdmin';

// ── SortableFeatureItem ───────────────────────────────────────────────────────

interface SortableFeatureItemProps {
  func: ProfessorFuncionalidadeAdmin;
  isSaving: boolean;
  onToggle: (habilitado: boolean) => void;
}

const SortableFeatureItem = ({ func, isSaving, onToggle }: SortableFeatureItemProps) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: func.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-3 px-3 py-2 rounded-md border transition-colors ${
        func.habilitado_professor
          ? 'border-border bg-card hover:bg-muted/20'
          : 'border-dashed border-muted-foreground/30 bg-muted/10'
      }`}
    >
      <button
        className="text-muted-foreground hover:text-foreground cursor-grab active:cursor-grabbing touch-none shrink-0"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="w-4 h-4" />
      </button>

      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium truncate ${!func.habilitado_professor ? 'text-muted-foreground' : ''}`}>
          {func.nome_exibicao}
        </p>
        <p className="text-xs text-muted-foreground font-mono">{func.chave}</p>
      </div>

      {!func.habilitado_professor && (
        <Badge variant="outline" className="text-xs text-muted-foreground shrink-0">
          Desativado
        </Badge>
      )}

      {isSaving
        ? <Loader2 className="w-4 h-4 animate-spin text-muted-foreground shrink-0" />
        : (
          <Switch
            checked={func.habilitado_professor}
            onCheckedChange={onToggle}
            className="shrink-0"
          />
        )
      }
    </div>
  );
};

// ── ProfessorFeaturesManager (main) ──────────────────────────────────────────

export const ProfessorFeaturesManager = () => {
  const { data: funcionalidades = [], isLoading } = useProfessorFuncionalidadesAdmin();
  const mut = useProfessorFeaturesAdminMutations();

  const [localOrder, setLocalOrder] = useState<ProfessorFuncionalidadeAdmin[] | null>(null);
  const displayFuncs = localOrder ?? funcionalidades;
  const hasUnsavedOrder = localOrder !== null;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor,   { activationConstraint: { delay: 200, tolerance: 5 } })
  );

  const handleDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const src = displayFuncs;
    const oldIdx = src.findIndex(f => f.id === active.id);
    const newIdx = src.findIndex(f => f.id === over.id);
    setLocalOrder(arrayMove(src, oldIdx, newIdx));
  };

  const handleSaveOrder = () => {
    if (!localOrder) return;
    mut.reorderFuncionalidades.mutate(
      localOrder.map(f => f.id),
      { onSuccess: () => setLocalOrder(null) }
    );
  };

  const handleToggle = (chave: string, habilitado: boolean) => {
    // Limpa ordem local para não conflitar com nova posição gerada pelo RPC
    setLocalOrder(null);
    mut.toggleFeature.mutate({ chave, habilitado });
  };

  const isSavingToggle = mut.toggleFeature.isPending;
  const savingChave = mut.toggleFeature.variables?.chave ?? null;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const habilitadas  = displayFuncs.filter(f => f.habilitado_professor);
  const desativadas  = displayFuncs.filter(f => !f.habilitado_professor);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Funcionalidades do Professor</h2>
        <p className="text-sm text-muted-foreground">
          Configure quais cards aparecem no dashboard do professor e em qual ordem.
          Sem vínculo com plano de assinatura.
        </p>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <CardTitle className="text-sm">Funcionalidades disponíveis para professores</CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                Toggle salva imediatamente · Arraste para definir a ordem de exibição
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
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={displayFuncs.map(f => f.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-1.5">
                {habilitadas.length > 0 && (
                  <>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide px-1 pt-1">
                      Ativas ({habilitadas.length})
                    </p>
                    {habilitadas.map(func => (
                      <SortableFeatureItem
                        key={func.id}
                        func={func}
                        isSaving={isSavingToggle && savingChave === func.chave}
                        onToggle={(habilitado) => handleToggle(func.chave, habilitado)}
                      />
                    ))}
                  </>
                )}

                {desativadas.length > 0 && (
                  <>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide px-1 pt-3">
                      Desativadas ({desativadas.length})
                    </p>
                    {desativadas.map(func => (
                      <SortableFeatureItem
                        key={func.id}
                        func={func}
                        isSaving={isSavingToggle && savingChave === func.chave}
                        onToggle={(habilitado) => handleToggle(func.chave, habilitado)}
                      />
                    ))}
                  </>
                )}

                {displayFuncs.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    Nenhuma funcionalidade cadastrada.
                  </p>
                )}
              </div>
            </SortableContext>
          </DndContext>
        </CardContent>
      </Card>
    </div>
  );
};
