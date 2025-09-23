import { supabase } from "@/integrations/supabase/client";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { ProtectedFeatureRoute } from "@/components/ProtectedFeatureRoute";
import { StudentHeader } from "@/components/StudentHeader";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useQuery } from "@tanstack/react-query";
import { useRecordedLessonViews } from "@/hooks/useRecordedLessonViews";
import { usePageTitle } from "@/hooks/useBreadcrumbs";
import { VideotecaCardPadrao, VideotecaVideoData } from "@/components/shared/VideotecaCardPadrao";
import dayjs from 'dayjs';
import timezone from 'dayjs/plugin/timezone';
import utc from 'dayjs/plugin/utc';

dayjs.extend(utc);
dayjs.extend(timezone);

const Videoteca = () => {
  // Configurar título da página
  usePageTitle('Videoteca');
  
  const { 
    markAsWatched, 
    isWatched, 
    getWatchedDate, 
    isMarking 
  } = useRecordedLessonViews();

  const { data: videos, isLoading, error } = useQuery({
    queryKey: ['videos'],
    queryFn: async () => {
      console.log('Buscando vídeos no Supabase...');
      const { data, error } = await supabase
        .from('videos')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('Erro ao buscar vídeos:', error);
        throw error;
      }
      
      console.log('Vídeos encontrados:', data?.length || 0);
      console.log('Dados dos vídeos:', data);
      return data || [];
    },
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-violet-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-redator-secondary mx-auto mb-4"></div>
          <p className="text-redator-accent">Carregando vídeos do banco de dados...</p>
        </div>
      </div>
    );
  }

  if (error) {
    console.error('Erro na página Videoteca:', error);
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-violet-100 flex items-center justify-center p-4">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-red-600 mb-2">❌ Erro ao carregar vídeos</h2>
          <p className="text-redator-accent mb-4">Erro: {error.message}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="bg-redator-secondary text-white px-4 py-2 rounded hover:bg-redator-secondary/90"
          >
            Tentar novamente
          </button>
        </div>
      </div>
    );
  }

  const handleAssistir = async (video: VideotecaVideoData) => {
    // Marcar como assistida primeiro
    const success = await markAsWatched(video.id, video.titulo);

    // Determinar a melhor URL para abrir
    let videoUrl = video.url;

    if (videoUrl) {
      // Verificar se é uma URL do YouTube e convertê-la para formato compatível
      const youtubeMatch = videoUrl.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/);
      if (youtubeMatch && youtubeMatch[1]) {
        // Usar embed do YouTube que contorna bloqueios
        const embedUrl = `https://www.youtube-nocookie.com/embed/${youtubeMatch[1]}?autoplay=1&rel=0&modestbranding=1`;

        // Tentar abrir em nova janela primeiro
        try {
          const newWindow = window.open(embedUrl, '_blank', 'width=1280,height=720,scrollbars=yes,resizable=yes');
          if (!newWindow) {
            // Se bloqueado, tentar URL original
            window.open(videoUrl, '_blank', 'noopener,noreferrer');
          }
        } catch (error) {
          // Fallback para URL original
          window.open(videoUrl, '_blank', 'noopener,noreferrer');
        }
      } else {
        // Para outras URLs, abrir diretamente
        window.open(videoUrl, '_blank', 'noopener,noreferrer');
      }
    }
  };

  return (
    <ProtectedRoute>
      <ProtectedFeatureRoute feature="videoteca" featureName="Videoteca">
        <TooltipProvider>
          <div className="min-h-screen bg-gradient-to-br from-purple-50 to-violet-100">
            <StudentHeader pageTitle="Videoteca" />

          <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
            {videos && videos.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {videos.filter(video => video.status_publicacao === 'publicado').map((video) => {
                  // Determinar thumbnail
                  let thumbnailUrl = video.thumbnail_url;
                  if (!thumbnailUrl && video.video_id && video.platform === 'youtube') {
                    thumbnailUrl = `https://i.ytimg.com/vi/${video.video_id}/hqdefault.jpg`;
                  }

                  // Determinar URL do vídeo
                  let videoUrl = video.video_url_original || video.youtube_url;

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
                    is_novo: isNovo && !isWatched(video.id)
                  };

                  return (
                    <VideotecaCardPadrao
                      key={video.id}
                      video={videoData}
                      perfil="aluno"
                      actions={{
                        onAssistir: handleAssistir
                      }}
                    />
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-12 px-4">
                <div className="text-4xl sm:text-6xl mb-4">🎥</div>
                <h3 className="text-lg sm:text-xl font-semibold text-redator-primary mb-2">Nenhum vídeo encontrado</h3>
                <p className="text-sm sm:text-base text-redator-accent mb-4">
                  Os vídeos educativos ainda não foram cadastrados no banco de dados.
                </p>
                <p className="text-xs sm:text-sm text-redator-accent/70">
                  ℹ️ Use o painel administrativo para adicionar novos vídeos à videoteca.
                </p>
              </div>
            )}
          </main>
        </div>
      </TooltipProvider>
      </ProtectedFeatureRoute>
    </ProtectedRoute>
  );
};

export default Videoteca;