
import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, ExternalLink } from 'lucide-react';
import { IconAction, ACTION_ICON } from '@/components/ui/icon-action';
import { IconActionGroup } from '@/components/admin/IconActionGroup';
import { useToast } from '@/hooks/use-toast';
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
import { VideoForm } from './VideoForm';

export const VideoList = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingVideo, setEditingVideo] = useState<any>(null);

  const { data: videos, isLoading, refetch } = useQuery({
    queryKey: ['admin-videos'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('videos')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
  });

  const handleDelete = async (id: string) => {
    try {
      console.log('🗑️ Iniciando exclusão do vídeo com ID:', id);
      
      // Verificar se é admin usando função do banco
      const { data: isAdmin, error: adminError } = await supabase.rpc('is_main_admin');
      
      if (adminError) {
        console.error('❌ Erro ao verificar permissões:', adminError);
        throw new Error('Erro ao verificar permissões do usuário');
      }

      if (!isAdmin) {
        throw new Error('Usuário não tem permissões de administrador');
      }
      console.log('✅ Usuário confirmado como admin');

      // Verificar se o vídeo existe antes da exclusão
      const { data: existingVideo, error: checkError } = await supabase
        .from('videos')
        .select('id, titulo')
        .eq('id', id)
        .single();

      if (checkError) {
        console.error('❌ Erro ao verificar existência do vídeo:', checkError);
        throw new Error('Vídeo não encontrado ou erro ao verificar existência');
      }

      console.log('✅ Vídeo encontrado para exclusão:', existingVideo.titulo);

      // Executar a exclusão
      const { error: deleteError, data: deleteData } = await supabase
        .from('videos')
        .delete()
        .eq('id', id)
        .select();

      if (deleteError) {
        console.error('❌ Erro do Supabase ao excluir vídeo:', deleteError);
        throw new Error(`Erro na exclusão: ${deleteError.message}`);
      }

      console.log('✅ Resultado da exclusão:', deleteData);

      // Verificar se realmente foi excluído
      const { data: checkDeleted, error: verifyError } = await supabase
        .from('videos')
        .select('id')
        .eq('id', id)
        .maybeSingle();

      if (verifyError) {
        console.error('⚠️ Erro ao verificar exclusão:', verifyError);
      } else if (checkDeleted) {
        console.error('❌ CRÍTICO: Vídeo ainda existe após exclusão!', checkDeleted);
        throw new Error('Falha na exclusão - registro ainda existe no banco de dados');
      } else {
        console.log('✅ CONFIRMADO: Vídeo foi excluído permanentemente do banco');
      }

      // Invalidar queries e forçar refetch
      await queryClient.invalidateQueries({ queryKey: ['admin-videos'] });
      await queryClient.invalidateQueries({ queryKey: ['videos'] });
      await refetch();

      toast({
        title: "✅ Exclusão Confirmada",
        description: "O vídeo foi removido permanentemente do sistema.",
      });

    } catch (error: any) {
      console.error('💥 ERRO COMPLETO na exclusão:', error);
      toast({
        title: "❌ Falha na Exclusão",
        description: error.message || "Não foi possível excluir o vídeo. Verifique suas permissões.",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return <div className="text-center py-4">Carregando vídeos...</div>;
  }

  if (editingId && editingVideo) {
    return (
      <VideoForm
        mode="edit"
        initialValues={editingVideo}
        onCancel={() => {
          setEditingId(null);
          setEditingVideo(null);
        }}
        onSuccess={() => {
          setEditingId(null);
          setEditingVideo(null);
        }}
      />
    );
  }

  // Função para toggle de status
  const handleToggleStatus = async (video: any) => {
    try {
      const newStatus = video.status_publicacao === 'publicado' ? 'rascunho' : 'publicado';
      
      const { error } = await supabase
        .from('videos')
        .update({ status_publicacao: newStatus })
        .eq('id', video.id);

      if (error) throw error;

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['admin-videos'] }),
        queryClient.invalidateQueries({ queryKey: ['videos'] }),
      ]);

      toast({
        title: "✅ Status atualizado!",
        description: `Vídeo ${newStatus === 'publicado' ? 'publicado' : 'marcado como rascunho'}.`,
      });
    } catch (error: any) {
      toast({
        title: "❌ Erro",
        description: "Erro ao alterar status: " + error.message,
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-redator-primary">Vídeos Cadastrados</h3>
      
      {videos && videos.length > 0 ? (
        <div className="grid gap-4">
          {videos.map((video) => {
            const thumbnailUrl = video.thumbnail_url || 
              (video.video_id && video.platform === 'youtube' 
                ? `https://i.ytimg.com/vi/${video.video_id}/hqdefault.jpg`
                : null);
            
            return (
              <Card key={video.id} className="border-redator-accent/20">
                <div className="flex gap-4 p-4">
                  {/* Thumbnail */}
                  <div className="flex-shrink-0 w-32 h-20">
                    {thumbnailUrl ? (
                      <img 
                        src={thumbnailUrl} 
                        alt={video.titulo}
                        className="w-full h-full object-cover rounded"
                        onError={(e) => {
                          e.currentTarget.src = 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=128&h=80&fit=crop';
                        }}
                      />
                    ) : (
                      <div className="w-full h-full bg-muted rounded flex items-center justify-center">
                        <span className="text-xs text-muted-foreground">
                          {video.platform === 'instagram' ? 'IG' : 'Vídeo'}
                        </span>
                      </div>
                    )}
                  </div>
                  
                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <h3 className="font-semibold text-redator-primary line-clamp-2 flex-1">
                        {video.titulo}
                      </h3>
                    </div>
                    
                    <div className="flex flex-wrap gap-2 mb-3">
                      {video.eixo_tematico && (
                        <Badge variant="secondary" className="text-xs">
                          {video.eixo_tematico}
                        </Badge>
                      )}
                      <Badge 
                        variant={video.status_publicacao === 'publicado' ? 'default' : 'outline'}
                        className="text-xs"
                      >
                        {video.status_publicacao === 'publicado' ? 'Publicado' : 'Rascunho'}
                      </Badge>
                      {video.platform && (
                        <Badge 
                          variant={video.platform === 'youtube' ? 'destructive' : 'default'}
                          className="text-xs"
                        >
                          {video.platform === 'youtube' ? 'YouTube' : 'Instagram'}
                        </Badge>
                      )}
                    </div>

                    <IconActionGroup responsive>
                      <IconAction
                        icon={ACTION_ICON.editar}
                        label="Editar"
                        intent="neutral"
                        onClick={() => {
                          setEditingId(video.id);
                          setEditingVideo(video);
                        }}
                        className="flex-1 sm:flex-none justify-center sm:justify-start"
                      />

                      <IconAction
                        icon={video.status_publicacao === 'publicado' ? ACTION_ICON.rascunho : ACTION_ICON.publicar}
                        label={video.status_publicacao === 'publicado' ? 'Tornar Rascunho' : 'Publicar'}
                        intent={video.status_publicacao === 'publicado' ? 'attention' : 'positive'}
                        onClick={() => handleToggleStatus(video)}
                        className="flex-1 sm:flex-none justify-center sm:justify-start"
                      />
                      
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
                              Confirmar Exclusão
                            </AlertDialogTitle>
                            <AlertDialogDescription>
                              Tem certeza que deseja excluir este vídeo? Esta ação não pode ser desfeita.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
                            <AlertDialogCancel className="w-full sm:w-auto">Cancelar</AlertDialogCancel>
                            <AlertDialogAction 
                              onClick={() => handleDelete(video.id)}
                              className="w-full sm:w-auto bg-red-600 hover:bg-red-700"
                            >
                              Excluir
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </IconActionGroup>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        <p className="text-redator-accent text-center py-8">Nenhum vídeo cadastrado ainda.</p>
      )}
    </div>
  );
};
