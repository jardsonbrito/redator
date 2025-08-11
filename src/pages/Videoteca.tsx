
import { Card, CardContent } from "@/components/ui/card";
import { Play } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { StudentHeader } from "@/components/StudentHeader";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { TooltipProvider } from "@/components/ui/tooltip";

const Videoteca = () => {
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

  const openVideo = (url: string) => {
    console.log('Abrindo vídeo:', url);
    window.open(url, '_blank');
  };

  // Função para extrair thumbnail do YouTube
  const getYouTubeThumbnail = (url: string): string => {
    const videoId = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/);
    if (videoId && videoId[1]) {
      return `https://img.youtube.com/vi/${videoId[1]}/maxresdefault.jpg`;
    }
    return url;
  };

  return (
    <ProtectedRoute>
      <TooltipProvider>
        <div className="min-h-screen bg-gradient-to-br from-purple-50 to-violet-100">
        <StudentHeader pageTitle="Videoteca" />

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
        {videos && videos.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {videos.filter(video => video.status_publicacao === 'publicado').map((video) => {
              // Usar thumbnail dos novos campos ou fallback para campos antigos
              let imageUrl = video.thumbnail_url;
              if (!imageUrl && video.video_id && video.platform === 'youtube') {
                imageUrl = `https://i.ytimg.com/vi/${video.video_id}/hqdefault.jpg`;
              } else if (!imageUrl && video.youtube_url) {
                imageUrl = getYouTubeThumbnail(video.youtube_url);
              }
              
              // Fallback final
              const defaultImageUrl = `https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=400&h=300&fit=crop&auto=format&q=80&sig=${video.id}`;
              const finalImageUrl = imageUrl || defaultImageUrl;
              
              // URL para abrir o vídeo
              const videoUrl = video.video_url_original || video.youtube_url;
              
              return (
                <div key={video.id} className="group cursor-pointer" onClick={() => openVideo(videoUrl)}>
                  <Card className="h-full transition-all duration-300 hover:shadow-lg hover:scale-105 border-redator-accent/20 hover:border-redator-secondary/50">
                    <div className="aspect-video overflow-hidden rounded-t-lg relative">
                      <img 
                        src={finalImageUrl}
                        alt={video.titulo || "Vídeo educativo"}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                        loading="lazy"
                        onError={(e) => {
                          const fallbackUrl = `https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=400&h=300&fit=crop&auto=format&q=80&sig=fallback-${video.id}`;
                          if (e.currentTarget.src !== fallbackUrl) {
                            e.currentTarget.src = fallbackUrl;
                          }
                        }}
                      />
                      <div className="absolute inset-0 bg-black bg-opacity-30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <Play className="w-8 h-8 sm:w-12 sm:h-12 text-white" />
                      </div>
                      <div className="absolute top-2 right-2 text-white text-xs px-2 py-1 rounded" 
                           style={{backgroundColor: video.platform === 'youtube' ? '#ff0000' : '#E4405F'}}>
                        {video.platform === 'youtube' ? 'YouTube' : 
                         video.platform === 'instagram' ? 'Instagram' : 'YouTube'}
                      </div>
                    </div>
                    <CardContent className="p-3 sm:p-4">
                      {(video.eixo_tematico || video.categoria) && (
                        <div className="mb-2">
                          <span className="text-xs font-medium text-white bg-redator-secondary px-2 py-1 rounded">
                            {video.eixo_tematico || video.categoria}
                          </span>
                        </div>
                      )}
                      {video.titulo && (
                        <h3 className="font-semibold text-sm sm:text-base text-redator-primary line-clamp-2 group-hover:text-redator-accent transition-colors">
                          {video.titulo}
                        </h3>
                      )}
                      <div className="mt-2 text-xs text-redator-accent">
                        📅 {new Date(video.created_at).toLocaleDateString('pt-BR')}
                      </div>
                    </CardContent>
                  </Card>
                </div>
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
    </ProtectedRoute>
  );
};

export default Videoteca;
