import React, { useState } from 'react';
import { CorretorLayout } from '@/components/corretor/CorretorLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Eye, MessageCircle, Calendar, Users, Plus, Edit, Trash2, StopCircle, MoreHorizontal } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useCorretorAuth } from '@/hooks/useCorretorAuth';
import { useToast } from '@/hooks/use-toast';
import CorretorLousaForm from '@/components/corretor/CorretorLousaForm';

interface Lousa {
  id: string;
  titulo: string;
  enunciado: string;
  status: string;
  created_at: string;
  turmas: string[];
  respostas_count?: number;
  respostas_corrigidas?: number;
}

export default function CorretorLousas() {
  const navigate = useNavigate();
  const { corretor } = useCorretorAuth();
  const { toast } = useToast();
  const [refresh, setRefresh] = useState(false);
  const [editingLousa, setEditingLousa] = useState<Lousa | null>(null);
  const [deletingLousaId, setDeletingLousaId] = useState<string | null>(null);
  const [endingLousaId, setEndingLousaId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isEnding, setIsEnding] = useState(false);

  const { data: lousas, isLoading, refetch } = useQuery({
    queryKey: ['corretor-lousas', corretor?.email, refresh],
    queryFn: async () => {
      if (!corretor?.email) {
        throw new Error('Corretor não autenticado');
      }

      const { data: lousasData, error: lousasError } = await supabase
        .from('lousa')
        .select('*')
        .order('created_at', { ascending: false });

      if (lousasError) {
        console.error('❌ Erro ao buscar lousas:', lousasError);
        throw lousasError;
      }

      // Buscar contagem de respostas para cada lousa
      const lousasComEstatisticas = await Promise.all(
        (lousasData || []).map(async (lousa: any) => {
          // Contar total de respostas
          const { count: totalRespostas } = await supabase
            .from('lousa_resposta')
            .select('id', { count: 'exact', head: true })
            .eq('lousa_id', lousa.id);

          // Contar respostas corrigidas
          const { count: respostasCorrigidas } = await supabase
            .from('lousa_resposta')
            .select('id', { count: 'exact', head: true })
            .eq('lousa_id', lousa.id)
            .not('nota', 'is', null);

          return {
            ...lousa,
            respostas_count: totalRespostas || 0,
            respostas_corrigidas: respostasCorrigidas || 0
          };
        })
      );

      console.log('✅ Lousas carregadas para corretor:', lousasComEstatisticas);
      return lousasComEstatisticas;
    },
    enabled: !!corretor?.email
  });

  const handleLousaCreated = () => {
    setRefresh(!refresh);
    refetch();
  };

  const handleDeleteLousa = async (lousaId: string) => {
    if (!corretor?.email) return;

    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from('lousa')
        .delete()
        .eq('id', lousaId);

      if (error) throw error;

      toast({
        title: 'Sucesso!',
        description: 'Lousa deletada com sucesso.',
      });

      setDeletingLousaId(null);
      refetch();
    } catch (error) {
      console.error('Erro ao deletar lousa:', error);
      toast({
        title: 'Erro',
        description: error instanceof Error ? error.message : 'Erro ao deletar lousa. Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleEndLousa = async (lousaId: string) => {
    if (!corretor?.email) return;

    setIsEnding(true);
    try {
      const { error } = await supabase
        .from('lousa')
        .update({ status: 'ended' })
        .eq('id', lousaId);

      if (error) throw error;

      toast({
        title: 'Sucesso!',
        description: 'Lousa encerrada com sucesso.',
      });

      setEndingLousaId(null);
      refetch();
    } catch (error) {
      console.error('Erro ao encerrar lousa:', error);
      toast({
        title: 'Erro',
        description: error instanceof Error ? error.message : 'Erro ao encerrar lousa. Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setIsEnding(false);
    }
  };

  const handleEditLousa = (lousa: Lousa) => {
    setEditingLousa(lousa);
  };

  const handleEditSuccess = () => {
    setEditingLousa(null);
    refetch();
  };

  const getStatusBadge = (status: string) => {
    const statusMap = {
      draft: { label: 'Rascunho', variant: 'outline' as const },
      active: { label: 'Ativa', variant: 'default' as const },
      ended: { label: 'Encerrada', variant: 'secondary' as const }
    };

    const statusInfo = statusMap[status as keyof typeof statusMap] || statusMap.draft;
    return <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>;
  };

  if (isLoading) {
    return (
      <CorretorLayout>
        <div className="flex items-center justify-center p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </CorretorLayout>
    );
  }

  return (
    <CorretorLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Lousas</h1>
        </div>

        <Tabs defaultValue="list" value={editingLousa ? "create" : undefined} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="list">Minhas Lousas</TabsTrigger>
            <TabsTrigger value="create">
              {editingLousa ? (
                <>
                  <Edit className="w-4 h-4 mr-2" />
                  Editar Lousa
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4 mr-2" />
                  Nova Lousa
                </>
              )}
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="list" className="space-y-6">
            {lousas && lousas.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <MessageCircle className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-semibold mb-2">Nenhuma lousa criada</h3>
                  <p className="text-muted-foreground mb-4">
                    Você ainda não criou nenhuma lousa. Clique na aba "Nova Lousa" para começar.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {lousas?.map((lousa) => (
                  <Card key={lousa.id} className="hover:shadow-md transition-shadow">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <CardTitle className="text-lg line-clamp-2">{lousa.titulo}</CardTitle>
                          <div className="flex items-center gap-2">
                            {getStatusBadge(lousa.status)}
                          </div>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleEditLousa(lousa)}>
                              <Edit className="mr-2 h-4 w-4" />
                              Editar
                            </DropdownMenuItem>
                            {lousa.status === 'active' && (
                              <DropdownMenuItem onClick={() => setEndingLousaId(lousa.id)}>
                                <StopCircle className="mr-2 h-4 w-4" />
                                Encerrar
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem 
                              onClick={() => setDeletingLousaId(lousa.id)}
                              className="text-destructive focus:text-destructive"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Deletar
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <p className="text-sm text-muted-foreground line-clamp-3">
                        {lousa.enunciado}
                      </p>
                      
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Calendar className="w-4 h-4" />
                          Criada em {format(new Date(lousa.created_at), 'dd/MM/yyyy', { locale: ptBR })}
                        </div>
                        
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Users className="w-4 h-4" />
                          Turmas: {lousa.turmas.join(', ')}
                        </div>
                        
                        <div className="flex items-center gap-4 text-sm">
                          <span className="text-muted-foreground">
                            Respostas: {lousa.respostas_count || 0}
                          </span>
                          <span className="text-green-600">
                            Corrigidas: {lousa.respostas_corrigidas || 0}
                          </span>
                        </div>
                      </div>

                      <div className="flex gap-2 pt-2">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="flex-1"
                          onClick={() => navigate(`/corretor/lousas/${lousa.id}`)}
                        >
                          <Eye className="w-4 h-4 mr-2" />
                          Ver Respostas
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="create">
            {editingLousa && (
              <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium text-blue-900">Editando: {editingLousa.titulo}</h3>
                    <p className="text-sm text-blue-700">Modifique os campos abaixo para atualizar a lousa.</p>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setEditingLousa(null)}
                  >
                    Cancelar Edição
                  </Button>
                </div>
              </div>
            )}
            {editingLousa ? (
              <CorretorLousaForm editData={editingLousa} onSuccess={handleEditSuccess} />
            ) : (
              <CorretorLousaForm onSuccess={handleLousaCreated} />
            )}
          </TabsContent>
        </Tabs>

        {/* Dialog para confirmar exclusão */}
        <AlertDialog open={!!deletingLousaId} onOpenChange={(open) => !open && setDeletingLousaId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Deletar Lousa</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja deletar esta lousa? Esta ação não pode ser desfeita.
                {deletingLousaId && lousas?.find(l => l.id === deletingLousaId)?.respostas_count && lousas.find(l => l.id === deletingLousaId)!.respostas_count! > 0 && (
                  <div className="mt-2 p-2 bg-destructive/10 border border-destructive/20 rounded">
                    <strong>Atenção:</strong> Esta lousa possui respostas e não pode ser deletada.
                  </div>
                )}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => deletingLousaId && handleDeleteLousa(deletingLousaId)}
                disabled={isDeleting || (deletingLousaId && lousas?.find(l => l.id === deletingLousaId)?.respostas_count ? lousas.find(l => l.id === deletingLousaId)!.respostas_count! > 0 : false)}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {isDeleting ? 'Deletando...' : 'Deletar'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Dialog para confirmar encerramento */}
        <AlertDialog open={!!endingLousaId} onOpenChange={(open) => !open && setEndingLousaId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Encerrar Lousa</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja encerrar esta lousa? Após encerrar, os alunos não poderão mais enviar respostas.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isEnding}>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => endingLousaId && handleEndLousa(endingLousaId)}
                disabled={isEnding}
              >
                {isEnding ? 'Encerrando...' : 'Encerrar'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </CorretorLayout>
  );
}