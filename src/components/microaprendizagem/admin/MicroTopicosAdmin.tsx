import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useMicroTopicosAdmin } from '@/hooks/useMicroTopicos';
import { MicroItensAdmin } from './MicroItensAdmin';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
  rectSortingStrategy,
  arrayMove,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Plus, Pencil, Trash2, ListChecks, MoreHorizontal, GripVertical, ImagePlus, BookOpen } from 'lucide-react';
import { sanitizeFileName } from '@/utils/fileUtils';
import { toast } from 'sonner';

const schema = z.object({
  titulo: z.string().min(1, 'Título obrigatório'),
  descricao: z.string().optional(),
  ordem: z.number().int().min(0),
  ativo: z.boolean(),
});
type FormData = z.infer<typeof schema>;

interface Topico {
  id: string;
  titulo: string;
  descricao: string | null;
  ordem: number;
  ativo: boolean;
  cover_storage_path?: string | null;
}

interface TopicoCardProps {
  topico: Topico;
  isDragging?: boolean;
  onItens: (t: Topico) => void;
  onEditar: (t: Topico) => void;
  onExcluir: (t: Topico) => void;
  dropdownAberto: string | null;
  setDropdownAberto: (id: string | null) => void;
}

const TopicoCard = ({ topico, isDragging = false, onItens, onEditar, onExcluir, dropdownAberto, setDropdownAberto }: TopicoCardProps) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging: isSortableDragging } = useSortable({ id: topico.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isSortableDragging ? 0.4 : 1,
  };

  const coverUrl = topico.cover_storage_path
    ? supabase.storage.from('micro-covers').getPublicUrl(topico.cover_storage_path).data.publicUrl
    : null;

  return (
    <Card
      ref={setNodeRef}
      style={style}
      className={`bg-white border border-border/20 rounded-lg shadow-sm overflow-hidden flex flex-col transition-all duration-200 ${isDragging ? 'shadow-xl ring-2 ring-primary/30' : 'hover:shadow-md'}`}
    >
      {/* Imagem de capa */}
      <div className="relative w-full aspect-video bg-gradient-to-br from-purple-50 to-purple-100 overflow-hidden">
        {coverUrl ? (
          <img src={coverUrl} alt={topico.titulo} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <BookOpen className="w-10 h-10 text-purple-300" />
          </div>
        )}
        {/* Badge status */}
        <div className="absolute top-2 right-2">
          <Badge className={`text-xs font-medium ${topico.ativo ? 'bg-green-500 text-white' : 'bg-gray-400 text-white'}`}>
            {topico.ativo ? 'Ativo' : 'Inativo'}
          </Badge>
        </div>
        {/* Handle de arrastar */}
        <div
          {...attributes}
          {...listeners}
          className="absolute top-2 left-2 cursor-grab active:cursor-grabbing p-1 rounded bg-black/20 hover:bg-black/30 touch-none"
          title="Arrastar para reordenar"
        >
          <GripVertical className="w-4 h-4 text-white/90" />
        </div>
      </div>

      <CardContent className="p-4 flex flex-col flex-1 gap-3">
        <div className="flex-1">
          <h3 className="font-semibold text-base text-foreground leading-tight">{topico.titulo}</h3>
          {topico.descricao && (
            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{topico.descricao}</p>
          )}
        </div>

        <div className="flex items-center gap-2 pt-2 border-t border-border/20">
          <Button
            variant="outline"
            size="sm"
            className="flex-1 h-9 text-xs"
            onClick={() => onItens(topico)}
          >
            <ListChecks className="w-3.5 h-3.5 mr-1.5" />
            Itens
          </Button>
          <DropdownMenu
            open={dropdownAberto === topico.id}
            onOpenChange={open => setDropdownAberto(open ? topico.id : null)}
          >
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-9 w-9 p-0 rounded-full bg-gray-100 hover:bg-gray-200">
                <MoreHorizontal className="h-4 w-4 text-gray-600" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44 shadow-lg border border-gray-200">
              <DropdownMenuItem
                className="flex items-center cursor-pointer hover:bg-gray-50"
                onClick={() => { setDropdownAberto(null); onEditar(topico); }}
              >
                <Pencil className="mr-2 h-4 w-4" />
                Editar
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="flex items-center cursor-pointer text-red-600 hover:bg-red-50"
                onClick={() => { setDropdownAberto(null); setTimeout(() => onExcluir(topico), 100); }}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Excluir
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardContent>
    </Card>
  );
};

export const MicroTopicosAdmin = () => {
  const queryClient = useQueryClient();
  const { data: topicos = [], isLoading } = useMicroTopicosAdmin();
  const [ordered, setOrdered] = useState<Topico[]>([]);
  const [activeTopico, setActiveTopico] = useState<Topico | null>(null);
  const [modo, setModo] = useState<'lista' | 'criar' | 'editar' | 'itens'>('lista');
  const [topicoSelecionado, setTopicoSelecionado] = useState<Topico | null>(null);
  const [topicoExcluindo, setTopicoExcluindo] = useState<Topico | null>(null);
  const [dropdownAberto, setDropdownAberto] = useState<string | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);

  useEffect(() => {
    setOrdered([...topicos].sort((a, b) => a.ordem - b.ordem));
  }, [topicos]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } }),
  );

  const { register, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { titulo: '', descricao: '', ordem: topicos.length, ativo: true },
  });

  const openEditar = (t: Topico) => {
    setTopicoSelecionado(t);
    reset({ titulo: t.titulo, descricao: t.descricao ?? '', ordem: t.ordem, ativo: t.ativo });
    setCoverFile(null);
    if (t.cover_storage_path) {
      const { data } = supabase.storage.from('micro-covers').getPublicUrl(t.cover_storage_path);
      setCoverPreview(data.publicUrl);
    } else {
      setCoverPreview(null);
    }
    setModo('editar');
  };

  const openCriar = () => {
    setTopicoSelecionado(null);
    reset({ titulo: '', descricao: '', ordem: topicos.length, ativo: true });
    setCoverFile(null);
    setCoverPreview(null);
    setModo('criar');
  };

  const uploadCover = async (topicoId: string): Promise<string | null> => {
    if (!coverFile) return topicoSelecionado?.cover_storage_path ?? null;
    const nome = sanitizeFileName(coverFile.name);
    const path = `${topicoId}/${Date.now()}_${nome}`;
    const { error } = await supabase.storage.from('micro-covers').upload(path, coverFile, { upsert: true });
    if (error) throw error;
    return path;
  };

  const mutation = useMutation({
    mutationFn: async (data: FormData) => {
      if (modo === 'editar' && topicoSelecionado) {
        const coverPath = await uploadCover(topicoSelecionado.id);
        const { error } = await supabase
          .from('micro_topicos')
          .update({ titulo: data.titulo, descricao: data.descricao || null, ordem: data.ordem, ativo: data.ativo, cover_storage_path: coverPath })
          .eq('id', topicoSelecionado.id);
        if (error) throw error;
      } else {
        const { data: novo, error } = await supabase
          .from('micro_topicos')
          .insert({ titulo: data.titulo, descricao: data.descricao || null, ordem: data.ordem, ativo: data.ativo })
          .select()
          .single();
        if (error) throw error;
        const coverPath = await uploadCover(novo.id);
        if (coverPath) {
          await supabase.from('micro_topicos').update({ cover_storage_path: coverPath }).eq('id', novo.id);
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['micro-topicos-admin'] });
      toast.success(modo === 'editar' ? 'Tópico atualizado!' : 'Tópico criado!');
      setModo('lista');
    },
    onError: (err: any) => toast.error(`Erro: ${err.message}`),
  });

  const excluirTopico = useMutation({
    mutationFn: async (id: string) => {
      const { data: itens } = await supabase
        .from('micro_itens')
        .select('conteudo_storage_path, tipo')
        .eq('topico_id', id)
        .not('conteudo_storage_path', 'is', null);

      const { error } = await supabase.from('micro_topicos').delete().eq('id', id);
      if (error) throw error;

      if (itens?.length) {
        const porBucket: Record<string, string[]> = {
          'micro-audio': [],
          'micro-pdfs': [],
          'micro-infograficos': [],
        };
        for (const item of itens) {
          if (!item.conteudo_storage_path) continue;
          const bucket = item.tipo === 'audio'
            ? 'micro-audio'
            : item.tipo === 'infografico'
            ? 'micro-infograficos'
            : 'micro-pdfs';
          porBucket[bucket].push(item.conteudo_storage_path);
        }
        await Promise.all(
          Object.entries(porBucket)
            .filter(([, paths]) => paths.length > 0)
            .map(([bucket, paths]) => supabase.storage.from(bucket).remove(paths))
        );
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['micro-topicos-admin'] });
      toast.success('Tópico excluído');
      setTopicoExcluindo(null);
    },
    onError: () => toast.error('Erro ao excluir tópico'),
  });

  const salvarOrdem = useMutation({
    mutationFn: async (items: Topico[]) => {
      const updates = items.map((t, idx) =>
        supabase.from('micro_topicos').update({ ordem: idx + 1 }).eq('id', t.id)
      );
      await Promise.all(updates);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['micro-topicos-admin'] }),
    onError: () => {
      toast.error('Erro ao salvar ordem');
      setOrdered([...topicos].sort((a, b) => a.ordem - b.ordem));
    },
  });

  const handleDragStart = (event: DragStartEvent) => {
    const t = ordered.find(i => i.id === event.active.id);
    setActiveTopico(t ?? null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveTopico(null);
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIdx = ordered.findIndex(i => i.id === active.id);
    const newIdx = ordered.findIndex(i => i.id === over.id);
    const newOrdered = arrayMove(ordered, oldIdx, newIdx);
    setOrdered(newOrdered);
    salvarOrdem.mutate(newOrdered);
  };

  if (modo === 'itens' && topicoSelecionado) {
    return (
      <MicroItensAdmin
        topicoId={topicoSelecionado.id}
        topicoTitulo={topicoSelecionado.titulo}
        onVoltar={() => setModo('lista')}
      />
    );
  }

  if (modo === 'criar' || modo === 'editar') {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {modo === 'criar' ? 'Novo Tópico' : `Editar: ${topicoSelecionado?.titulo}`}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(d => mutation.mutate(d))} className="space-y-4">
            <div className="space-y-1">
              <Label>Título *</Label>
              <Input {...register('titulo')} placeholder="Ex: Tese, Repertório, Introdução..." />
              {errors.titulo && <p className="text-xs text-red-500">{errors.titulo.message}</p>}
            </div>
            <div className="space-y-1">
              <Label>Descrição</Label>
              <Textarea {...register('descricao')} placeholder="Breve descrição do tópico" rows={2} />
            </div>
            <div className="space-y-2">
              <Label>Imagem de capa</Label>
              <div className="flex items-start gap-3">
                {coverPreview && (
                  <img src={coverPreview} alt="Capa" className="w-20 h-14 object-cover rounded-lg border border-gray-200 shrink-0" />
                )}
                <label className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-gray-200 rounded-lg p-3 cursor-pointer hover:border-purple-300 transition-colors">
                  <ImagePlus className="w-5 h-5 text-gray-400 mb-1" />
                  <span className="text-xs text-gray-400">{coverFile ? coverFile.name : 'Clique para enviar (JPG, PNG, WebP)'}</span>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={e => {
                      const f = e.target.files?.[0] ?? null;
                      setCoverFile(f);
                      if (f) setCoverPreview(URL.createObjectURL(f));
                    }}
                  />
                </label>
              </div>
            </div>
            <div className="space-y-1">
              <Label>Ordem de exibição</Label>
              <Input
                type="number"
                min={0}
                {...register('ordem', { valueAsNumber: true })}
                className="w-24"
              />
            </div>
            <div className="flex items-center gap-3">
              <Switch
                checked={watch('ativo')}
                onCheckedChange={v => setValue('ativo', v)}
              />
              <Label>{watch('ativo') ? (
                <span className="text-green-600 font-medium">Tópico ativo</span>
              ) : (
                <span className="text-gray-400">Tópico inativo</span>
              )}</Label>
            </div>
            <div className="flex gap-2 pt-2">
              <Button type="submit" disabled={mutation.isPending} className="bg-[#3f0776] hover:bg-[#643293]">
                {mutation.isPending ? 'Salvando...' : modo === 'criar' ? 'Criar tópico' : 'Salvar'}
              </Button>
              <Button type="button" variant="outline" onClick={() => setModo('lista')}>
                Cancelar
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <p className="text-sm text-muted-foreground">{ordered.length} tópico(s) cadastrado(s)</p>
        <Button className="bg-[#3f0776] hover:bg-[#643293] w-full sm:w-auto" onClick={openCriar}>
          <Plus className="w-4 h-4 mr-2" />
          Novo Tópico
        </Button>
      </div>

      {isLoading ? (
        <p className="text-sm text-gray-400 text-center py-8">Carregando...</p>
      ) : ordered.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <BookOpen className="mx-auto w-12 h-12 mb-3 opacity-40" />
          <p className="text-sm">Nenhum tópico cadastrado.</p>
          <Button variant="outline" size="sm" className="mt-3" onClick={openCriar}>
            <Plus className="w-4 h-4 mr-1" />
            Criar primeiro tópico
          </Button>
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={ordered.map(t => t.id)} strategy={rectSortingStrategy}>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {ordered.map(topico => (
                <TopicoCard
                  key={topico.id}
                  topico={topico}
                  onItens={t => { setTopicoSelecionado(t); setModo('itens'); }}
                  onEditar={openEditar}
                  onExcluir={t => setTopicoExcluindo(t)}
                  dropdownAberto={dropdownAberto}
                  setDropdownAberto={setDropdownAberto}
                />
              ))}
            </div>
          </SortableContext>
          <DragOverlay>
            {activeTopico && (
              <TopicoCard
                topico={activeTopico}
                isDragging
                onItens={() => {}}
                onEditar={() => {}}
                onExcluir={() => {}}
                dropdownAberto={null}
                setDropdownAberto={() => {}}
              />
            )}
          </DragOverlay>
        </DndContext>
      )}

      <AlertDialog open={!!topicoExcluindo} onOpenChange={open => !open && setTopicoExcluindo(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir tópico</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir <strong>{topicoExcluindo?.titulo}</strong> e todos os seus itens? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() => topicoExcluindo && excluirTopico.mutate(topicoExcluindo.id)}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
