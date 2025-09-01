import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Video, Play } from "lucide-react";
import { CorretorLayout } from "@/components/corretor/CorretorLayout";

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

  // Função para extrair thumbnail do YouTube
  const getYouTubeThumbnail = (url: string): string => {
    const videoId = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/);
    if (videoId && videoId[1]) {
      return `https://img.youtube.com/vi/${videoId[1]}/maxresdefault.jpg`;
    }
    return url;
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

  // Agrupar vídeos por categoria
  const videosPorCategoria = videos?.reduce((acc, video) => {
    const categoria = video.categoria || 'Geral';
    if (!acc[categoria]) {
      acc[categoria] = [];
    }
    acc[categoria].push(video);
    return acc;
  }, {} as Record<string, any[]>) || {};

  return (
    <CorretorLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Videoteca</h1>
          <p className="text-gray-600">Vídeos disponíveis para consulta</p>
        </div>

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
              
              return (
                <div key={video.id} className="group">
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
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            {video.titulo && (
                              <h3 className="font-semibold text-sm sm:text-base text-redator-primary line-clamp-2 group-hover:text-redator-accent transition-colors">
                                {video.titulo}
                              </h3>
                            )}
                          </div>
                          
                          {(video.eixo_tematico || video.categoria) && (
                            <div className="mb-2">
                              <span className="text-xs font-medium text-white bg-redator-secondary px-2 py-1 rounded">
                                {video.eixo_tematico || video.categoria}
                              </span>
                            </div>
                          )}
                          
                          <div className="text-xs text-redator-accent">
                            📅 {new Date(video.created_at).toLocaleDateString('pt-BR')}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="text-xs bg-amber-100 text-amber-700">
                            Nova
                          </Badge>
                        </div>
                        
                        <Button 
                          size="sm"
                          className="flex items-center gap-2" 
                          onClick={() => window.open(video.youtube_url, '_blank')}
                        >
                          <Play className="h-3 w-3" />
                          Assistir
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </div>
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