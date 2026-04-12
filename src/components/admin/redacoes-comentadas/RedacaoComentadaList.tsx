import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { MoreHorizontal, Pencil, Trash2, Eye, EyeOff, MessageSquare } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface RedacaoComentada {
  id: string;
  titulo: string;
  modo_correcao_id: string;
  turmas_autorizadas: string[];
  ativo: boolean;
  publicado_em: string | null;
  criado_em: string;
  modos_correcao?: { nome: string } | null;
}

interface Props {
  onEdit: (id: string) => void;
}

const MODO_LABELS: Record<string, string> = {
  enem: 'ENEM',
  pedagogico: 'Pedagógico',
  revisao_linguistica: 'Revisão Linguística',
};

const MODO_COLORS: Record<string, string> = {
  enem: 'bg-red-100 text-red-700 border-red-200',
  pedagogico: 'bg-blue-100 text-blue-700 border-blue-200',
  revisao_linguistica: 'bg-green-100 text-green-700 border-green-200',
};

export const RedacaoComentadaList = ({ onEdit }: Props) => {
  const queryClient = useQueryClient();
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const { data: redacoes = [], isLoading } = useQuery({
    queryKey: ['admin-redacoes-comentadas'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('redacoes_comentadas')
        .select('id, titulo, modo_correcao_id, turmas_autorizadas, ativo, publicado_em, criado_em')
        .order('criado_em', { ascending: false });
      if (error) throw error;
      return (data || []) as RedacaoComentada[];
    },
  });

  const handleToggleAtivo = async (item: RedacaoComentada) => {
    setTogglingId(item.id);
    try {
      const updates: any = { ativo: !item.ativo };
      if (!item.ativo && !item.publicado_em) {
        updates.publicado_em = new Date().toISOString();
      }
      const { error } = await supabase
        .from('redacoes_comentadas')
        .update(updates)
        .eq('id', item.id);
      if (error) throw error;
      await queryClient.invalidateQueries({ queryKey: ['admin-redacoes-comentadas'] });
      toast.success(item.ativo ? 'Redação ocultada' : 'Redação publicada');
    } catch {
      toast.error('Erro ao atualizar visibilidade');
    } finally {
      setTogglingId(null);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await supabase.from('redacao_comentada_blocos').delete().eq('redacao_comentada_id', deleteId);
      const { error } = await supabase.from('redacoes_comentadas').delete().eq('id', deleteId);
      if (error) throw error;
      await queryClient.invalidateQueries({ queryKey: ['admin-redacoes-comentadas'] });
      toast.success('Redação comentada excluída');
    } catch {
      toast.error('Erro ao excluir redação comentada');
    } finally {
      setDeleteId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-20 bg-muted rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  if (redacoes.length === 0) {
    return (
      <Card>
        <CardContent className="text-center py-12">
          <MessageSquare className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
          <p className="text-muted-foreground">Nenhuma redação comentada criada ainda.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="space-y-3">
        {redacoes.map((item) => (
          <Card key={item.id} className={!item.ativo ? 'opacity-60' : ''}>
            <CardContent className="flex items-center justify-between p-4">
              <div className="flex-1 min-w-0 mr-4">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className="font-medium truncate">{item.titulo}</span>
                  <Badge
                    variant="outline"
                    className={`text-xs shrink-0 ${MODO_COLORS[item.modo_correcao_id] || ''}`}
                  >
                    {MODO_LABELS[item.modo_correcao_id] || item.modo_correcao_id}
                  </Badge>
                  {item.ativo ? (
                    <Badge className="bg-green-100 text-green-700 border border-green-200 text-xs shrink-0">
                      Publicado
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-xs shrink-0">
                      Oculto
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span>
                    Turmas: {item.turmas_autorizadas.length > 0
                      ? item.turmas_autorizadas.join(', ')
                      : 'Nenhuma'}
                  </span>
                  {item.publicado_em && (
                    <span>
                      Publicado em {format(new Date(item.publicado_em), "dd/MM/yyyy", { locale: ptBR })}
                    </span>
                  )}
                </div>
              </div>

              <DropdownMenu
                open={openDropdownId === item.id}
                onOpenChange={(open) => setOpenDropdownId(open ? item.id : null)}
              >
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0 shrink-0">
                    <MoreHorizontal className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" onCloseAutoFocus={(e) => e.preventDefault()}>
                  <DropdownMenuItem
                    onClick={() => {
                      setOpenDropdownId(null);
                      setTimeout(() => onEdit(item.id), 100);
                    }}
                  >
                    <Pencil className="w-4 h-4 mr-2" />
                    Editar
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => {
                      setOpenDropdownId(null);
                      handleToggleAtivo(item);
                    }}
                    disabled={togglingId === item.id}
                  >
                    {item.ativo ? (
                      <><EyeOff className="w-4 h-4 mr-2" />Ocultar</>
                    ) : (
                      <><Eye className="w-4 h-4 mr-2" />Publicar</>
                    )}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-destructive"
                    onClick={() => {
                      setOpenDropdownId(null);
                      setTimeout(() => setDeleteId(item.id), 100);
                    }}
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Excluir
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </CardContent>
          </Card>
        ))}
      </div>

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir redação comentada?</AlertDialogTitle>
            <AlertDialogDescription>
              Todos os blocos de conteúdo serão excluídos permanentemente. Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
