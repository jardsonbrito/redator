import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useMicroItensAdmin } from '@/hooks/useMicroItens';
import { MicroItemForm } from './MicroItemForm';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
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
import { Plus, Pencil, Trash2, ArrowLeft, ArrowUp, ArrowDown, Eye, EyeOff, MoreHorizontal, PlaySquare, FileText, StickyNote, AudioWaveform, Mic, Brain, GalleryHorizontalEnd, Image, type LucideIcon } from 'lucide-react';
import { toast } from 'sonner';
import type { MicroItem } from '@/hooks/useMicroItens';

const TIPO_CONFIG: Record<string, { icon: LucideIcon; label: string; iconBg: string; iconColor: string }> = {
  video:       { icon: PlaySquare,           label: 'Vídeo',       iconBg: 'bg-gray-800',   iconColor: 'text-white' },
  microtexto:  { icon: FileText,             label: 'Microtexto',  iconBg: 'bg-green-100',  iconColor: 'text-green-700' },
  card:        { icon: StickyNote,           label: 'Card',        iconBg: 'bg-amber-100',  iconColor: 'text-amber-600' },
  audio:       { icon: AudioWaveform,        label: 'Áudio',       iconBg: 'bg-slate-100',  iconColor: 'text-slate-700' },
  podcast:     { icon: Mic,                  label: 'Podcast',     iconBg: 'bg-slate-100',  iconColor: 'text-slate-600' },
  quiz:        { icon: Brain,                label: 'Quiz',        iconBg: 'bg-purple-100', iconColor: 'text-purple-700' },
  flashcard:   { icon: GalleryHorizontalEnd, label: 'Flashcard',   iconBg: 'bg-blue-100',   iconColor: 'text-blue-700' },
  infografico: { icon: Image,                label: 'Infográfico', iconBg: 'bg-teal-100',   iconColor: 'text-teal-700' },
};

interface Props {
  topicoId: string;
  topicoTitulo: string;
  onVoltar: () => void;
}

export const MicroItensAdmin = ({ topicoId, topicoTitulo, onVoltar }: Props) => {
  const queryClient = useQueryClient();
  const { data: itens = [], isLoading } = useMicroItensAdmin(topicoId);
  const [modo, setModo] = useState<'lista' | 'criar' | 'editar'>('lista');
  const [itemEditando, setItemEditando] = useState<MicroItem | null>(null);
  const [itemExcluindo, setItemExcluindo] = useState<MicroItem | null>(null);
  const [dropdownAberto, setDropdownAberto] = useState<string | null>(null);

  const toggleStatus = useMutation({
    mutationFn: async (item: MicroItem) => {
      const { error } = await supabase
        .from('micro_itens')
        .update({ status: item.status === 'ativo' ? 'inativo' : 'ativo' })
        .eq('id', item.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['micro-itens-admin', topicoId] });
      toast.success('Status atualizado');
    },
    onError: () => toast.error('Erro ao atualizar status'),
  });

  const moverOrdem = useMutation({
    mutationFn: async ({ id, novaOrdem }: { id: string; novaOrdem: number }) => {
      const { error } = await supabase.from('micro_itens').update({ ordem: novaOrdem }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['micro-itens-admin', topicoId] }),
  });

  const mover = (item: MicroItem, direcao: 'up' | 'down') => {
    const sorted = [...itens].sort((a, b) => a.ordem - b.ordem);
    const idx = sorted.findIndex(t => t.id === item.id);
    const outro = direcao === 'up' ? sorted[idx - 1] : sorted[idx + 1];
    if (!outro) return;
    moverOrdem.mutate({ id: item.id, novaOrdem: outro.ordem });
    moverOrdem.mutate({ id: outro.id, novaOrdem: item.ordem });
  };

  const excluirItem = useMutation({
    mutationFn: async (id: string) => {
      // Buscar o item antes de deletar para saber o storage path e bucket
      const { data: item } = await supabase
        .from('micro_itens')
        .select('conteudo_storage_path, tipo')
        .eq('id', id)
        .single();

      // Apagar o registro do banco
      const { error } = await supabase.from('micro_itens').delete().eq('id', id);
      if (error) throw error;

      // Apagar o arquivo do Storage (hard delete)
      if (item?.conteudo_storage_path) {
        const bucket = item.tipo === 'audio'
          ? 'micro-audio'
          : item.tipo === 'infografico'
          ? 'micro-infograficos'
          : 'micro-pdfs';

        await supabase.storage.from(bucket).remove([item.conteudo_storage_path]);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['micro-itens-admin', topicoId] });
      toast.success('Item excluído');
      setItemExcluindo(null);
    },
    onError: () => toast.error('Erro ao excluir'),
  });

  if (modo === 'criar' || modo === 'editar') {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => { setModo('lista'); setItemEditando(null); }}>
            <ArrowLeft className="w-4 h-4 mr-1" />
            Voltar
          </Button>
          <span className="text-muted-foreground">/</span>
          <h3 className="text-base font-semibold text-foreground">
            {modo === 'criar' ? 'Novo item' : 'Editar item'}
          </h3>
        </div>
        <MicroItemForm
          topicoId={topicoId}
          item={itemEditando}
          onSuccess={() => { setModo('lista'); setItemEditando(null); }}
          onCancel={() => { setModo('lista'); setItemEditando(null); }}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3 flex-wrap">
          <Button variant="ghost" size="sm" onClick={onVoltar} className="text-primary hover:bg-primary/10 -ml-2">
            <ArrowLeft className="w-4 h-4 mr-1" />
            Tópicos
          </Button>
          <span className="text-muted-foreground">/</span>
          <div>
            <h2 className="text-xl font-bold text-foreground">{topicoTitulo}</h2>
            <p className="text-sm text-muted-foreground">{itens.length} {itens.length === 1 ? 'item' : 'itens'}</p>
          </div>
        </div>
        <Button
          className="bg-[#3f0776] hover:bg-[#643293] w-full sm:w-auto"
          onClick={() => setModo('criar')}
        >
          <Plus className="w-4 h-4 mr-2" />
          Novo Item
        </Button>
      </div>

      {/* Grid de itens */}
      {isLoading ? (
        <p className="text-sm text-gray-400 text-center py-8">Carregando...</p>
      ) : itens.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <FileText className="mx-auto w-12 h-12 mb-3 opacity-40" />
          <p className="text-sm">Nenhum item neste tópico.</p>
          <Button variant="outline" size="sm" className="mt-3" onClick={() => setModo('criar')}>
            <Plus className="w-4 h-4 mr-1" />
            Criar primeiro item
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {itens.map((item, idx) => {
            const cfg = TIPO_CONFIG[item.tipo];
            const Icon = cfg?.icon ?? FileText;
            return (
              <Card
                key={item.id}
                className="bg-white hover:shadow-md transition-all duration-200 border border-border/20 rounded-lg shadow-sm overflow-hidden flex flex-col"
              >
                {/* Topo colorido com ícone do tipo */}
                <div className={`relative w-full h-28 flex items-center justify-center ${cfg?.iconBg ?? 'bg-gray-100'}`}>
                  <Icon className={`w-12 h-12 opacity-70 ${cfg?.iconColor ?? 'text-gray-500'}`} />
                  {/* Badge status */}
                  <div className="absolute top-2 right-2">
                    <Badge
                      className={`text-xs font-medium ${item.status === 'ativo' ? 'bg-green-500 text-white' : 'bg-gray-400 text-white'}`}
                    >
                      {item.status === 'ativo' ? 'Ativo' : 'Inativo'}
                    </Badge>
                  </div>
                  {/* Tipo */}
                  <div className="absolute bottom-2 left-2">
                    <Badge variant="secondary" className="text-xs bg-white/80 text-gray-700">
                      {cfg?.label ?? item.tipo}
                    </Badge>
                  </div>
                </div>

                <CardContent className="p-4 flex flex-col flex-1 gap-3">
                  {/* Título */}
                  <div className="flex-1">
                    <h3 className="font-semibold text-base text-foreground leading-tight line-clamp-2">{item.titulo}</h3>
                    <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2">
                      <span className="text-xs text-muted-foreground">Ordem: {item.ordem}</span>
                      {item.planos_permitidos.length > 0 && (
                        <span className="text-xs text-muted-foreground">
                          {item.planos_permitidos.join(', ')}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Ações */}
                  <div className="flex items-center gap-2 pt-2 border-t border-border/20">
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-9 w-9 p-0"
                        disabled={idx === 0 || moverOrdem.isPending}
                        onClick={() => mover(item, 'up')}
                        title="Mover para cima"
                      >
                        <ArrowUp className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-9 w-9 p-0"
                        disabled={idx === itens.length - 1 || moverOrdem.isPending}
                        onClick={() => mover(item, 'down')}
                        title="Mover para baixo"
                      >
                        <ArrowDown className="w-4 h-4" />
                      </Button>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 h-9 text-xs"
                      onClick={() => { setItemEditando(item); setModo('editar'); }}
                    >
                      <Pencil className="w-3.5 h-3.5 mr-1.5" />
                      Editar
                    </Button>
                    <DropdownMenu
                      open={dropdownAberto === item.id}
                      onOpenChange={open => setDropdownAberto(open ? item.id : null)}
                    >
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-9 w-9 p-0 rounded-full bg-gray-100 hover:bg-gray-200">
                          <MoreHorizontal className="h-4 w-4 text-gray-600" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48 shadow-lg border border-gray-200">
                        <DropdownMenuItem
                          className="flex items-center cursor-pointer hover:bg-gray-50"
                          onClick={() => {
                            setDropdownAberto(null);
                            toggleStatus.mutate(item);
                          }}
                        >
                          {item.status === 'ativo' ? (
                            <><EyeOff className="mr-2 h-4 w-4" />Desativar</>
                          ) : (
                            <><Eye className="mr-2 h-4 w-4" />Ativar</>
                          )}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="flex items-center cursor-pointer text-red-600 hover:bg-red-50"
                          onClick={() => {
                            setDropdownAberto(null);
                            setTimeout(() => setItemExcluindo(item), 100);
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

      {/* Dialog de exclusão */}
      <AlertDialog open={!!itemExcluindo} onOpenChange={open => !open && setItemExcluindo(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir item</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir <strong>{itemExcluindo?.titulo}</strong>? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() => itemExcluindo && excluirItem.mutate(itemExcluindo.id)}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
