
import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { VideoFormModern as VideoForm } from './VideoFormModern';
import { VideotecaCardPadrao, VideotecaVideoData } from '@/components/shared/VideotecaCardPadrao';

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

  const handlePublicar = async (videoId: string) => {
    try {
      const { error } = await supabase
        .from('videos')
        .update({ status_publicacao: 'publicado' })
        .eq('id', videoId);

      if (error) throw error;

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['admin-videos'] }),
        queryClient.invalidateQueries({ queryKey: ['videos'] }),
      ]);

      toast({
        title: "✅ Vídeo publicado!",
        description: "O vídeo foi publicado com sucesso.",
      });
    } catch (error: any) {
      toast({
        title: "❌ Erro",
        description: "Erro ao publicar vídeo: " + error.message,
        variant: "destructive",
      });
    }
  };

  const handleDespublicar = async (videoId: string) => {
    try {
      const { error } = await supabase
        .from('videos')
        .update({ status_publicacao: 'rascunho' })
        .eq('id', videoId);

      if (error) throw error;

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['admin-videos'] }),
        queryClient.invalidateQueries({ queryKey: ['videos'] }),
      ]);

      toast({
        title: "✅ Vídeo despublicado!",
        description: "O vídeo foi marcado como rascunho.",
      });
    } catch (error: any) {
      toast({
        title: "❌ Erro",
        description: "Erro ao despublicar vídeo: " + error.message,
        variant: "destructive",
      });
    }
  };

  const handleEditar = (video: any) => {
    setEditingId(video.id);
    setEditingVideo(video);
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-redator-primary">Vídeos Cadastrados</h3>
      
      {videos && videos.length > 0 ? (
        <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {videos.map((video) => {
            // Determinar thumbnail
            let thumbnailUrl = video.thumbnail_url;
            if (!thumbnailUrl && video.video_id && video.platform === 'youtube') {
              thumbnailUrl = `https://i.ytimg.com/vi/${video.video_id}/hqdefault.jpg`;
            }

            // Determinar URL do vídeo
            const videoUrl = video.video_url_original || video.youtube_url;

            // Determinar se é novo baseado na data (últimos 7 dias)
            const isNovo = video.created_at ?
              (new Date().getTime() - new Date(video.created_at).getTime()) < (7 * 24 * 60 * 60 * 1000) :
              false;

            const videoData: VideotecaVideoData = {
              id: video.id,
              titulo: video.titulo || 'Vídeo',
              url: videoUrl,
              eixo_tematico: video.eixo_tematico || video.categoria,
              plataforma: video.platform || 'youtube',
              data_publicacao: video.created_at,
              publicado: video.status_publicacao === 'publicado',
              thumbnail_url: thumbnailUrl,
              is_novo: isNovo
            };

            return (
              <VideotecaCardPadrao
                key={video.id}
                video={videoData}
                perfil="admin"
                actions={{
                  onEditar: () => handleEditar(video),
                  onExcluir: handleDelete,
                  onPublicar: handlePublicar,
                  onDespublicar: handleDespublicar
                }}
              />
            );
          })}
        </div>
      ) : (
        <p className="text-redator-accent text-center py-8">Nenhum vídeo cadastrado ainda.</p>
      )}
    </div>
  );
};
