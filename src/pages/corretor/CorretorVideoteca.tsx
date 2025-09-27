import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Video } from "lucide-react";
import { CorretorLayout } from "@/components/corretor/CorretorLayout";
import { VideotecaCardPadrao, VideotecaVideoData } from "@/components/shared/VideotecaCardPadrao";

const CorretorVideoteca = () => {
  const { data: videos, isLoading, error } = useQuery({
    queryKey: ['videos-corretor'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('videos')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data || [];
    }
  });

  const handleAssistir = (video: VideotecaVideoData) => {
    if (video.url) {
      // Verificar se é uma URL do YouTube e abrir diretamente no YouTube
      const youtubeMatch = video.url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/);
      if (youtubeMatch && youtubeMatch[1]) {
        // Abrir diretamente no YouTube
        const youtubeUrl = `https://www.youtube.com/watch?v=${youtubeMatch[1]}`;

        // Para dispositivos móveis, tentar abrir no app do YouTube primeiro
        const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        if (isMobile) {
          try {
            // Tentar abrir no app do YouTube
            window.location.href = `youtube://watch?v=${youtubeMatch[1]}`;
            // Fallback para navegador após um breve delay
            setTimeout(() => {
              window.open(youtubeUrl, '_blank', 'noopener,noreferrer');
            }, 500);
          } catch {
            window.open(youtubeUrl, '_blank', 'noopener,noreferrer');
          }
        } else {
          window.open(youtubeUrl, '_blank', 'noopener,noreferrer');
        }
      } else {
        // Para outras URLs (Instagram, etc.), abrir diretamente
        window.open(video.url, '_blank', 'noopener,noreferrer');
      }
    }
  };

  if (isLoading) {
    return (
      <CorretorLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Videoteca</h1>
            <p className="text-gray-600">Vídeos disponíveis para consulta</p>
          </div>
          <div className="text-center">Carregando vídeos...</div>
        </div>
      </CorretorLayout>
    );
  }

  if (error) {
    return (
      <CorretorLayout>
        <div className="text-center py-8">
          <p className="text-red-600">Erro ao carregar vídeos. Tente novamente.</p>
        </div>
      </CorretorLayout>
    );
  }


  return (
    <CorretorLayout>
      <div className="space-y-4 sm:space-y-6 px-3 sm:px-0">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Videoteca</h1>
        </div>

        {videos && videos.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {videos.filter(video => video.status_publicacao === 'publicado').map((video) => {
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
                titulo: video.titulo || 'Vídeo educativo',
                url: videoUrl,
                eixo_tematico: video.eixo_tematico || video.categoria,
                plataforma: video.platform || 'youtube',
                data_publicacao: video.created_at,
                thumbnail_url: thumbnailUrl,
                is_novo: isNovo
              };

              return (
                <VideotecaCardPadrao
                  key={video.id}
                  video={videoData}
                  perfil="corretor"
                  actions={{
                    onAssistir: handleAssistir
                  }}
                />
              );
            })}
          </div>
        ) : (
          <Card>
            <CardContent className="text-center py-12">
              <Video className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-600 mb-2">
                Nenhum vídeo disponível
              </h3>
              <p className="text-gray-500">
                Os vídeos aparecerão aqui quando forem publicados.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </CorretorLayout>
  );
};

export default CorretorVideoteca;