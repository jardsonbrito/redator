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
import { Plus, Pencil, Trash2, ArrowLeft, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import type { MicroItem } from '@/hooks/useMicroItens';

const TIPO_LABEL: Record<string, string> = {
  video: '🎥 Vídeo',
  audio: '🎙️ Áudio',
  podcast: '🎧 Podcast',
  microtexto: '📄 Microtexto',
  infografico: '🖼️ Infográfico',
  card: '📌 Card',
  quiz: '❓ Quiz',
  flashcard: '🃏 Flashcard',
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
          <h3 className="text-base font-semibold text-gray-700">
            {modo === 'criar' ? 'Novo item' : 'Editar item'} — {topicoTitulo}
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
    <div className="space-y-4">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={onVoltar}>
            <ArrowLeft className="w-4 h-4 mr-1" />
            Tópicos
          </Button>
          <h3 className="text-base font-semibold text-gray-700">
            {topicoTitulo}
          </h3>
          <Badge variant="outline" className="text-xs">{itens.length} itens</Badge>
        </div>
        <Button
          size="sm"
          className="bg-[#3f0776] hover:bg-[#643293]"
          onClick={() => setModo('criar')}
        >
          <Plus className="w-4 h-4 mr-1" />
          Novo Item
        </Button>
      </div>

      {/* Lista */}
      {isLoading ? (
        <p className="text-sm text-gray-400 text-center py-8">Carregando...</p>
      ) : itens.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <p className="text-sm">Nenhum item neste tópico.</p>
          <Button variant="outline" size="sm" className="mt-3" onClick={() => setModo('criar')}>
            <Plus className="w-4 h-4 mr-1" />
            Criar primeiro item
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          {itens.map((item) => (
            <Card key={item.id} className="border border-gray-100">
              <CardContent className="py-3 px-4 flex items-center gap-3">
                <span className="text-lg shrink-0">{TIPO_LABEL[item.tipo]?.split(' ')[0]}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{item.titulo}</p>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    <span className="text-xs text-gray-400">{TIPO_LABEL[item.tipo]?.split(' ').slice(1).join(' ')}</span>
                    <span className="text-xs text-gray-300">·</span>
                    <span className="text-xs text-gray-400">Ordem: {item.ordem}</span>
                    {item.planos_permitidos.length > 0 && (
                      <>
                        <span className="text-xs text-gray-300">·</span>
                        <span className="text-xs text-gray-400">
                          {item.planos_permitidos.join(', ')}
                        </span>
                      </>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Badge
                    variant={item.status === 'ativo' ? 'default' : 'secondary'}
                    className={`text-xs ${item.status === 'ativo' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}
                  >
                    {item.status === 'ativo' ? 'Ativo' : 'Inativo'}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    title={item.status === 'ativo' ? 'Desativar' : 'Ativar'}
                    onClick={() => toggleStatus.mutate(item)}
                  >
                    {item.status === 'ativo' ? (
                      <EyeOff className="w-3 h-3 text-gray-400" />
                    ) : (
                      <Eye className="w-3 h-3 text-gray-400" />
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => { setItemEditando(item); setModo('editar'); }}
                  >
                    <Pencil className="w-3 h-3 text-gray-400" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-red-300 hover:text-red-500"
                    onClick={() => setItemExcluindo(item)}
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
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
