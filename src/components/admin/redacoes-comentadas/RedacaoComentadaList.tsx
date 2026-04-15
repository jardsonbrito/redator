import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { MoreHorizontal, Pencil, Trash2, Eye, EyeOff, ExternalLink, MessageSquare } from 'lucide-react';
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
import { supabase as supabaseClient } from '@/integrations/supabase/client';

interface RedacaoComentada {
  id: string;
  titulo: string;
  modo_correcao_id: string;
  turmas_autorizadas: string[];
  ativo: boolean;
  publicado_em: string | null;
  criado_em: string;
  eixo_tematico: string | null;
  capa_source: string | null;
  capa_url: string | null;
  capa_file_path: string | null;
}

function resolveCapaUrl(item: RedacaoComentada): string {
  if (item.capa_source === 'url' && item.capa_url) return item.capa_url;
  if (item.capa_source === 'upload' && item.capa_file_path) {
    const { data } = supabaseClient.storage.from('themes').getPublicUrl(item.capa_file_path);
    return data.publicUrl;
  }
  return '/placeholders/aula-cover.png';
}

interface Props {
  onEdit: (id: string) => void;
}

const MODO_LABELS: Record<string, string> = {
  enem: 'ENEM',
  pedagogico: 'Pedagógico',
  revisao_linguistica: 'Revisão Linguística',
};

const MODO_BADGE_COLORS: Record<string, string> = {
  enem: 'bg-red-100 text-red-700',
  pedagogico: 'bg-blue-100 text-blue-700',
  revisao_linguistica: 'bg-green-100 text-green-700',
};

export const RedacaoComentadaList = ({ onEdit }: Props) => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const { data: redacoes = [], isLoading } = useQuery({
    queryKey: ['admin-redacoes-comentadas'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('redacoes_comentadas')
        .select('id, titulo, modo_correcao_id, turmas_autorizadas, ativo, publicado_em, criado_em, eixo_tematico, capa_source, capa_url, capa_file_path')
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
      <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map(i => (
          <Card key={i} className="overflow-hidden">
            <div className="aspect-[16/9] bg-gray-200 animate-pulse" />
            <div className="p-6 space-y-3">
              <div className="h-6 bg-gray-200 rounded animate-pulse" />
              <div className="h-4 bg-gray-200 rounded animate-pulse w-3/4" />
              <div className="h-10 bg-gray-200 rounded animate-pulse" />
            </div>
          </Card>
        ))}
      </div>
    );
  }

  if (redacoes.length === 0) {
    return (
      <Card>
        <div className="text-center py-12 px-6">
          <MessageSquare className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
          <p className="text-muted-foreground">Nenhuma redação comentada criada ainda.</p>
        </div>
      </Card>
    );
  }

  return (
    <>
      <h3 className="text-lg font-semibold text-redator-primary mb-4">Redações Cadastradas</h3>

      <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
        {redacoes.map((item) => (
          <Card
            key={item.id}
            className={`overflow-hidden shadow-md rounded-2xl border border-gray-200 bg-white ${!item.ativo ? 'opacity-60' : ''}`}
          >
            {/* Capa 16:9 */}
            <div className="aspect-[16/9] overflow-hidden bg-gradient-to-br from-purple-100 to-violet-200 relative">
              <img
                src={resolveCapaUrl(item)}
                alt={`Capa: ${item.titulo}`}
                className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
                onError={(e) => { e.currentTarget.src = '/placeholders/aula-cover.png'; }}
                loading="lazy"
              />
              {/* Badge do modo sobre a imagem */}
              <div className="absolute top-2 left-2">
                <Badge className={`text-xs ${MODO_BADGE_COLORS[item.modo_correcao_id] || 'bg-gray-100 text-gray-700'}`}>
                  {MODO_LABELS[item.modo_correcao_id] || item.modo_correcao_id}
                </Badge>
              </div>
            </div>

            {/* Conteúdo */}
            <div className="p-6">
              <div className="space-y-4">
                {/* Título + dropdown */}
                <div className="flex justify-between items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <h2 className="text-lg font-semibold text-gray-900 leading-tight mb-1">
                      {item.titulo}
                    </h2>
                    <div className="flex items-center gap-2 flex-wrap">
                      {item.ativo ? (
                        <Badge className="text-xs bg-green-100 text-green-700">Publicado</Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs">Oculto</Badge>
                      )}
                    </div>
                  </div>

                  {/* Menu três pontinhos */}
                  <div className="flex-shrink-0">
                    <DropdownMenu
                      open={openDropdownId === item.id}
                      onOpenChange={(open) => setOpenDropdownId(open ? item.id : null)}
                    >
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 rounded-full bg-gray-100 hover:bg-gray-200"
                        >
                          <MoreHorizontal className="h-4 w-4" />
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
                          {item.ativo
                            ? <><EyeOff className="w-4 h-4 mr-2" />Ocultar</>
                            : <><Eye className="w-4 h-4 mr-2" />Publicar</>
                          }
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-red-600"
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
                  </div>
                </div>

                {/* Eixo temático */}
                {item.eixo_tematico && (
                  <div className="inline-flex items-center px-3 py-1 rounded-full bg-violet-100 text-violet-800 text-xs font-medium">
                    {item.eixo_tematico}
                  </div>
                )}

                {/* Botão Ver */}
                <div className="pt-2">
                  <Button
                    className="w-full font-semibold bg-green-600 hover:bg-green-700 text-white"
                    onClick={() => navigate(`/redacoes-comentadas/${item.id}`)}
                  >
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Ver Redação
                  </Button>
                </div>
              </div>
            </div>
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
