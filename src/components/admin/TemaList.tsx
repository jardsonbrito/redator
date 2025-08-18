import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Calendar, Clock, CheckCircle, X as ClearIcon } from 'lucide-react';
import { IconAction, ACTION_ICON } from '@/components/ui/icon-action';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TemaForm } from './TemaForm';
import { getTemaCoverUrl } from '@/utils/temaImageUtils';
import { useAdminTemasFilters } from '@/hooks/useAdminTemasFilters';
import { AutocompleteInput } from "@/components/filters/AutocompleteInput";
import { supabase } from '@/integrations/supabase/client';

export const TemaList = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);

  // Usar o hook de filtros admin
  const {
    temas,
    isLoading,
    error,
    fraseFilter,
    statusFilter,
    statusOptions,
    fraseSuggestions,
    hasActiveFilters,
    updateFraseFilter,
    updateStatusFilter,
    clearFilters,
  } = useAdminTemasFilters();

  const refetch = async () => {
    await queryClient.invalidateQueries({ queryKey: ['admin-temas-all'] });
  };

  const getThemeStatus = (tema: any) => {
    const now = new Date();
    const scheduledDate = tema.scheduled_publish_at ? new Date(tema.scheduled_publish_at) : null;
    
    if (tema.status === 'publicado') {
      return { 
        type: 'published', 
        label: 'Publicado', 
        variant: 'default' as const,
        publishedAt: tema.published_at ? new Date(tema.published_at) : null
      };
    }
    
    if (scheduledDate && scheduledDate > now) {
      return { 
        type: 'scheduled', 
        label: `Agendado para ${format(scheduledDate, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}`, 
        variant: 'secondary' as const,
        scheduledDate
      };
    }
    
    if (scheduledDate && scheduledDate <= now) {
      return { 
        type: 'overdue', 
        label: 'Publicação pendente', 
        variant: 'destructive' as const,
        scheduledDate
      };
    }
    
    return { 
      type: 'draft', 
      label: 'Rascunho', 
      variant: 'secondary' as const
    };
  };

  const publishNow = async (id: string) => {
    try {
      const { error } = await supabase
        .from('temas')
        .update({
          status: 'publicado',
          published_at: new Date().toISOString(),
          scheduled_publish_at: null,
          scheduled_by: null
        })
        .eq('id', id);

      if (error) throw error;

      await queryClient.invalidateQueries({ queryKey: ['admin-temas'] });

      toast({
        title: "✅ Tema publicado",
        description: "O tema foi publicado imediatamente.",
      });

    } catch (error: any) {
      toast({
        title: "❌ Erro",
        description: error.message || "Erro ao publicar tema.",
        variant: "destructive",
      });
    }
  };

  const cancelScheduling = async (id: string) => {
    try {
      const { error } = await supabase
        .from('temas')
        .update({
          scheduled_publish_at: null,
          scheduled_by: null
        })
        .eq('id', id);

      if (error) throw error;

      await queryClient.invalidateQueries({ queryKey: ['admin-temas'] });

      toast({
        title: "✅ Agendamento cancelado",
        description: "O agendamento de publicação foi removido.",
      });

    } catch (error: any) {
      toast({
        title: "❌ Erro",
        description: error.message || "Erro ao cancelar agendamento.",
        variant: "destructive",
      });
    }
  };

  const toggleStatus = async (id: string, currentStatus: string) => {
    try {
      const newStatus = currentStatus === 'publicado' ? 'rascunho' : 'publicado';
      
      const { error } = await supabase
        .from('temas')
        .update({ 
          status: newStatus,
          // Clear scheduling if making it published manually
          ...(newStatus === 'publicado' && {
            published_at: new Date().toISOString(),
            scheduled_publish_at: null,
            scheduled_by: null
          })
        })
        .eq('id', id);

      if (error) throw error;

      // Invalidar queries para recarregar os dados
      await queryClient.invalidateQueries({ queryKey: ['admin-temas'] });

      toast({
        title: "✅ Status alterado",
        description: `Tema alterado para ${newStatus}.`,
      });

    } catch (error: any) {
      toast({
        title: "❌ Erro",
        description: error.message || "Erro ao alterar status do tema.",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      console.log('🗑️ Iniciando exclusão do tema com ID:', id);
      
      // Verificar autenticação do usuário
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        throw new Error('Usuário não autenticado');
      }
      console.log('✅ Usuário autenticado:', user.email);

      // Verificar se é admin com query corrigida
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('user_type')
        .eq('id', user.id)
        .single();

      if (profileError) {
        console.error('❌ Erro ao verificar perfil:', profileError);
        throw new Error('Erro ao verificar permissões do usuário');
      }

      if (!profile || profile.user_type !== 'admin') {
        throw new Error('Usuário não tem permissões de administrador');
      }
      console.log('✅ Usuário confirmado como admin');

      // Verificar se o tema existe antes da exclusão
      const { data: existingTema, error: checkError } = await supabase
        .from('temas')
        .select('id, frase_tematica')
        .eq('id', id)
        .single();

      if (checkError) {
        console.error('❌ Erro ao verificar existência do tema:', checkError);
        throw new Error('Tema não encontrado ou erro ao verificar existência');
      }

      console.log('✅ Tema encontrado para exclusão:', existingTema.frase_tematica);

      // Executar a exclusão
      const { error: deleteError, data: deleteData } = await supabase
        .from('temas')
        .delete()
        .eq('id', id)
        .select();

      if (deleteError) {
        console.error('❌ Erro do Supabase ao excluir tema:', deleteError);
        throw new Error(`Erro na exclusão: ${deleteError.message}`);
      }

      console.log('✅ Resultado da exclusão:', deleteData);

      // Verificar se realmente foi excluído
      const { data: checkDeleted, error: verifyError } = await supabase
        .from('temas')
        .select('id')
        .eq('id', id)
        .maybeSingle();

      if (verifyError) {
        console.error('⚠️ Erro ao verificar exclusão:', verifyError);
      } else if (checkDeleted) {
        console.error('❌ CRÍTICO: Tema ainda existe após exclusão!', checkDeleted);
        throw new Error('Falha na exclusão - registro ainda existe no banco de dados');
      } else {
        console.log('✅ CONFIRMADO: Tema foi excluído permanentemente do banco');
      }

      // Invalidar queries e forçar refetch
      await queryClient.invalidateQueries({ queryKey: ['admin-temas'] });
      await queryClient.invalidateQueries({ queryKey: ['temas'] });
      await refetch();

      toast({
        title: "✅ Exclusão Confirmada",
        description: "O tema foi removido permanentemente do sistema.",
      });

    } catch (error: any) {
      console.error('💥 ERRO COMPLETO na exclusão:', error);
      toast({
        title: "❌ Falha na Exclusão",
        description: error.message || "Não foi possível excluir o tema. Verifique suas permissões.",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return <div className="text-center py-4">Carregando temas...</div>;
  }

  if (editingId) {
    return (
      <TemaForm
        mode="edit"
        temaId={editingId}
        onCancel={() => setEditingId(null)}
        onSuccess={() => setEditingId(null)}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-redator-primary">Temas Cadastrados</h3>
      </div>
      
      {/* Seção de Filtros Admin */}
      <div className="mb-6">
        <div className="flex flex-col sm:flex-row gap-4 mb-4">
          <div className="flex-1">
            <AutocompleteInput
              value={fraseFilter}
              onValueChange={updateFraseFilter}
              suggestions={fraseSuggestions}
              placeholder="Filtrar por frase temática..."
              className="w-full"
            />
          </div>
          
          <div className="w-full sm:w-64">
            <Select value={statusFilter} onValueChange={updateStatusFilter}>
              <SelectTrigger className="bg-background border border-input">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent className="bg-popover border border-border z-50">
                {statusOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Indicador de filtros ativos e botão limpar */}
        {hasActiveFilters && (
          <div className="flex items-center justify-between bg-muted/50 rounded-lg p-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>
                {temas?.length || 0} tema(s) encontrado(s)
                {fraseFilter && ` para "${fraseFilter}"`}
                {statusFilter && statusFilter !== 'todos' && ` com status "${statusOptions.find(s => s.value === statusFilter)?.label}"`}
              </span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={clearFilters}
              className="text-sm"
            >
              <ClearIcon className="h-4 w-4 mr-2" />
              Limpar filtros
            </Button>
          </div>
        )}
      </div>
      
      {temas && temas.length > 0 ? (
        <div className="grid gap-4">
          {temas.map((tema) => (
            <Card key={tema.id} className="border-redator-accent/20">
              <div className="flex flex-col sm:flex-row">
                {/* Cover Image */}
                <div className="w-full sm:w-48 h-32 sm:h-auto overflow-hidden rounded-t-lg sm:rounded-l-lg sm:rounded-t-none bg-muted flex-shrink-0">
                  <img 
                    src={getTemaCoverUrl(tema)} 
                    alt={`Capa do tema: ${tema.frase_tematica}`}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.src = '/lovable-uploads/66db3418-766f-47b9-836b-07a6a228a79c.png';
                    }}
                  />
                </div>
                
                <div className="flex-1">
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-base text-redator-primary line-clamp-2 mb-2">
                          {tema.frase_tematica}
                        </CardTitle>
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            {tema.eixo_tematico}
                          </Badge>
                          
                          {(() => {
                            const status = getThemeStatus(tema);
                            return (
                              <Badge variant={status.variant} className="text-xs flex items-center gap-1">
                                {status.type === 'published' && <CheckCircle className="w-3 h-3" />}
                                {status.type === 'scheduled' && <Clock className="w-3 h-3" />}
                                {status.type === 'overdue' && <AlertTriangle className="w-3 h-3" />}
                                {status.label}
                              </Badge>
                            );
                          })()}
                          
                          {tema.needs_media_update && (
                            <Badge variant="destructive" className="text-xs">
                              Pendente de mídia
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="pt-2">
                    <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 mt-4">
                      <IconAction
                        icon={ACTION_ICON.editar}
                        label="Editar"
                        intent="neutral"
                        onClick={() => setEditingId(tema.id)}
                        className="flex-1 sm:flex-none justify-center sm:justify-start"
                      />

                      {(() => {
                        const status = getThemeStatus(tema);
                        
                        if (status.type === 'scheduled') {
                          return (
                            <>
                              <IconAction
                                icon={ACTION_ICON.publicar}
                                label="Publicar Agora"
                                intent="positive"
                                onClick={() => publishNow(tema.id)}
                                className="flex-1 sm:flex-none justify-center sm:justify-start"
                              />
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => cancelScheduling(tema.id)}
                                className="flex-1 sm:flex-none"
                              >
                                <Calendar className="w-4 h-4 mr-2" />
                                Cancelar Agendamento
                              </Button>
                            </>
                          );
                        }
                        
                        if (status.type === 'overdue') {
                          return (
                            <IconAction
                              icon={ACTION_ICON.publicar}
                              label="Publicar Agora (Atrasado)"
                              intent="positive"
                              onClick={() => publishNow(tema.id)}
                              className="flex-1 sm:flex-none justify-center sm:justify-start"
                            />
                          );
                        }
                        
                        return (
                          <IconAction
                            icon={tema.status === 'publicado' ? ACTION_ICON.rascunho : ACTION_ICON.publicar}
                            label={tema.status === 'publicado' ? 'Tornar Rascunho' : 'Publicar'}
                            intent={tema.status === 'publicado' ? 'neutral' : 'positive'}
                            onClick={() => toggleStatus(tema.id, tema.status || 'publicado')}
                            className="flex-1 sm:flex-none justify-center sm:justify-start"
                            asSwitch
                            checked={tema.status === 'publicado'}
                          />
                        );
                      })()}
                      
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <IconAction
                            icon={ACTION_ICON.excluir}
                            label="Excluir"
                            intent="danger"
                            className="flex-1 sm:flex-none justify-center sm:justify-start"
                          />
                        </AlertDialogTrigger>
                        <AlertDialogContent className="max-w-md mx-4">
                          <AlertDialogHeader>
                            <AlertDialogTitle className="flex items-center gap-2">
                              <AlertTriangle className="w-5 h-5 text-red-500" />
                              Confirmar Exclusão Permanente
                            </AlertDialogTitle>
                            <AlertDialogDescription>
                              <strong>ATENÇÃO:</strong> Esta ação é irreversível! O tema será removido permanentemente do banco de dados e não poderá ser recuperado.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
                            <AlertDialogCancel className="w-full sm:w-auto">Cancelar</AlertDialogCancel>
                            <AlertDialogAction 
                              onClick={() => handleDelete(tema.id)}
                              className="w-full sm:w-auto bg-red-600 hover:bg-red-700"
                            >
                              Excluir Permanentemente
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </CardContent>
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-8">
          <p className="text-redator-accent">
            {hasActiveFilters 
              ? "Nenhum tema encontrado para os filtros aplicados." 
              : "Nenhum tema cadastrado ainda."
            }
          </p>
          {hasActiveFilters && (
            <Button
              variant="outline"
              size="sm"
              onClick={clearFilters}
              className="mt-4"
            >
              <ClearIcon className="h-4 w-4 mr-2" />
              Limpar filtros
            </Button>
          )}
        </div>
      )}
    </div>
  );
};