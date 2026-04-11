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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Plus, Pencil, Trash2, ListChecks, ChevronDown, ChevronUp, MoreHorizontal, ImagePlus, BookOpen } from 'lucide-react';
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

export const MicroTopicosAdmin = () => {
  const queryClient = useQueryClient();
  const { data: topicos = [], isLoading } = useMicroTopicosAdmin();
  const [modo, setModo] = useState<'lista' | 'criar' | 'editar' | 'itens'>('lista');
  const [topicoSelecionado, setTopicoSelecionado] = useState<Topico | null>(null);
  const [topicoExcluindo, setTopicoExcluindo] = useState<Topico | null>(null);
  const [dropdownAberto, setDropdownAberto] = useState<string | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);

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
      // Buscar todos os itens do tópico com storage path antes de deletar
      const { data: itens } = await supabase
        .from('micro_itens')
        .select('conteudo_storage_path, tipo')
        .eq('topico_id', id)
        .not('conteudo_storage_path', 'is', null);

      // Apagar o tópico (CASCADE apaga os itens no banco)
      const { error } = await supabase.from('micro_topicos').delete().eq('id', id);
      if (error) throw error;

      // Hard delete dos arquivos no Storage
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
            {/* Imagem de capa */}
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

  // Modo lista
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <p className="text-sm text-muted-foreground">{topicos.length} tópico(s) cadastrado(s)</p>
        <Button className="bg-[#3f0776] hover:bg-[#643293] w-full sm:w-auto" onClick={openCriar}>
          <Plus className="w-4 h-4 mr-2" />
          Novo Tópico
        </Button>
      </div>

      {isLoading ? (
        <p className="text-sm text-gray-400 text-center py-8">Carregando...</p>
      ) : topicos.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <BookOpen className="mx-auto w-12 h-12 mb-3 opacity-40" />
          <p className="text-sm">Nenhum tópico cadastrado.</p>
          <Button variant="outline" size="sm" className="mt-3" onClick={openCriar}>
            <Plus className="w-4 h-4 mr-1" />
            Criar primeiro tópico
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...topicos].sort((a, b) => a.ordem - b.ordem).map((topico, idx, arr) => {
            const coverUrl = topico.cover_storage_path
              ? supabase.storage.from('micro-covers').getPublicUrl(topico.cover_storage_path).data.publicUrl
              : null;

            return (
              <Card
                key={topico.id}
                className="bg-white hover:shadow-md transition-all duration-200 border border-border/20 rounded-lg shadow-sm overflow-hidden flex flex-col"
              >
                {/* Imagem de capa */}
                <div className="relative w-full aspect-video bg-gradient-to-br from-purple-50 to-purple-100 overflow-hidden">
                  {coverUrl ? (
                    <img
                      src={coverUrl}
                      alt={topico.titulo}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <BookOpen className="w-10 h-10 text-purple-300" />
                    </div>
                  )}
                  {/* Badge status sobre a imagem */}
                  <div className="absolute top-2 right-2">
                    <Badge
                      className={`text-xs font-medium ${topico.ativo ? 'bg-green-500 text-white' : 'bg-gray-400 text-white'}`}
                    >
                      {topico.ativo ? 'Ativo' : 'Inativo'}
                    </Badge>
                  </div>
                  {/* Ordem */}
                  <div className="absolute top-2 left-2 flex flex-col gap-0.5">
                    <Button
                      variant="ghost" size="icon"
                      className="h-6 w-6 bg-white/80 hover:bg-white rounded-full shadow-sm"
                      disabled={idx === 0}
                      onClick={() => mover(topico, 'up')}
                    >
                      <ChevronUp className="w-3 h-3" />
                    </Button>
                    <Button
                      variant="ghost" size="icon"
                      className="h-6 w-6 bg-white/80 hover:bg-white rounded-full shadow-sm"
                      disabled={idx === arr.length - 1}
                      onClick={() => mover(topico, 'down')}
                    >
                      <ChevronDown className="w-3 h-3" />
                    </Button>
                  </div>
                </div>

                <CardContent className="p-4 flex flex-col flex-1 gap-3">
                  {/* Título e descrição */}
                  <div className="flex-1">
                    <h3 className="font-semibold text-base text-foreground leading-tight">{topico.titulo}</h3>
                    {topico.descricao && (
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{topico.descricao}</p>
                    )}
                  </div>

                  {/* Ações */}
                  <div className="flex items-center gap-2 pt-2 border-t border-border/20">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 h-9 text-xs"
                      onClick={() => { setTopicoSelecionado(topico); setModo('itens'); }}
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
                          onClick={() => { setDropdownAberto(null); openEditar(topico); }}
                        >
                          <Pencil className="mr-2 h-4 w-4" />
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="flex items-center cursor-pointer text-red-600 hover:bg-red-50"
                          onClick={() => {
                            setDropdownAberto(null);
                            setTimeout(() => setTopicoExcluindo(topico), 100);
                          }}
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
          })}
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
