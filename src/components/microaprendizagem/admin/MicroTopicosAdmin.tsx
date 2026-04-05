import { useState } from 'react';
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
import { Plus, Pencil, Trash2, ListChecks, ArrowUpDown, ChevronDown, ChevronUp } from 'lucide-react';
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
}

export const MicroTopicosAdmin = () => {
  const queryClient = useQueryClient();
  const { data: topicos = [], isLoading } = useMicroTopicosAdmin();
  const [modo, setModo] = useState<'lista' | 'criar' | 'editar' | 'itens'>('lista');
  const [topicoSelecionado, setTopicoSelecionado] = useState<Topico | null>(null);
  const [topicoExcluindo, setTopicoExcluindo] = useState<Topico | null>(null);

  const { register, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { titulo: '', descricao: '', ordem: topicos.length, ativo: true },
  });

  const openEditar = (t: Topico) => {
    setTopicoSelecionado(t);
    reset({ titulo: t.titulo, descricao: t.descricao ?? '', ordem: t.ordem, ativo: t.ativo });
    setModo('editar');
  };

  const openCriar = () => {
    setTopicoSelecionado(null);
    reset({ titulo: '', descricao: '', ordem: topicos.length, ativo: true });
    setModo('criar');
  };

  const mutation = useMutation({
    mutationFn: async (data: FormData) => {
      if (modo === 'editar' && topicoSelecionado) {
        const { error } = await supabase
          .from('micro_topicos')
          .update({ titulo: data.titulo, descricao: data.descricao || null, ordem: data.ordem, ativo: data.ativo })
          .eq('id', topicoSelecionado.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('micro_topicos')
          .insert({ titulo: data.titulo, descricao: data.descricao || null, ordem: data.ordem, ativo: data.ativo });
        if (error) throw error;
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
      const { error } = await supabase.from('micro_topicos').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['micro-topicos-admin'] });
      toast.success('Tópico excluído');
      setTopicoExcluindo(null);
    },
    onError: () => toast.error('Erro ao excluir tópico'),
  });

  const moverOrdem = useMutation({
    mutationFn: async ({ id, novaOrdem }: { id: string; novaOrdem: number }) => {
      const { error } = await supabase.from('micro_topicos').update({ ordem: novaOrdem }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['micro-topicos-admin'] }),
  });

  const mover = (topico: Topico, direcao: 'up' | 'down') => {
    const sorted = [...topicos].sort((a, b) => a.ordem - b.ordem);
    const idx = sorted.findIndex(t => t.id === topico.id);
    const outro = direcao === 'up' ? sorted[idx - 1] : sorted[idx + 1];
    if (!outro) return;
    moverOrdem.mutate({ id: topico.id, novaOrdem: outro.ordem });
    moverOrdem.mutate({ id: outro.id, novaOrdem: topico.ordem });
  };

  // Modo de gerenciamento de itens
  if (modo === 'itens' && topicoSelecionado) {
    return (
      <MicroItensAdmin
        topicoId={topicoSelecionado.id}
        topicoTitulo={topicoSelecionado.titulo}
        onVoltar={() => setModo('lista')}
      />
    );
  }

  // Modo de formulário
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

  // Modo lista
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-gray-700">Tópicos</h3>
          <p className="text-xs text-gray-400 mt-0.5">{topicos.length} tópico(s) cadastrado(s)</p>
        </div>
        <Button size="sm" className="bg-[#3f0776] hover:bg-[#643293]" onClick={openCriar}>
          <Plus className="w-4 h-4 mr-1" />
          Novo Tópico
        </Button>
      </div>

      {isLoading ? (
        <p className="text-sm text-gray-400 text-center py-8">Carregando...</p>
      ) : topicos.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <p className="text-sm">Nenhum tópico cadastrado.</p>
          <Button variant="outline" size="sm" className="mt-3" onClick={openCriar}>
            <Plus className="w-4 h-4 mr-1" />
            Criar primeiro tópico
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          {[...topicos].sort((a, b) => a.ordem - b.ordem).map((topico, idx, arr) => (
            <Card key={topico.id} className="border border-gray-100">
              <CardContent className="py-3 px-4 flex items-center gap-3">
                {/* Botões de reordenação */}
                <div className="flex flex-col gap-0.5 shrink-0">
                  <Button
                    variant="ghost" size="icon" className="h-5 w-5"
                    disabled={idx === 0}
                    onClick={() => mover(topico, 'up')}
                  >
                    <ChevronUp className="w-3 h-3" />
                  </Button>
                  <Button
                    variant="ghost" size="icon" className="h-5 w-5"
                    disabled={idx === arr.length - 1}
                    onClick={() => mover(topico, 'down')}
                  >
                    <ChevronDown className="w-3 h-3" />
                  </Button>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-gray-800">{topico.titulo}</p>
                    <Badge
                      variant={topico.ativo ? 'default' : 'secondary'}
                      className={`text-xs ${topico.ativo ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}
                    >
                      {topico.ativo ? 'Ativo' : 'Inativo'}
                    </Badge>
                  </div>
                  {topico.descricao && (
                    <p className="text-xs text-gray-400 truncate mt-0.5">{topico.descricao}</p>
                  )}
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => { setTopicoSelecionado(topico); setModo('itens'); }}
                  >
                    <ListChecks className="w-3 h-3 mr-1" />
                    Itens
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditar(topico)}>
                    <Pencil className="w-3 h-3 text-gray-400" />
                  </Button>
                  <Button
                    variant="ghost" size="icon" className="h-7 w-7 text-red-300 hover:text-red-500"
                    onClick={() => setTopicoExcluindo(topico)}
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
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
