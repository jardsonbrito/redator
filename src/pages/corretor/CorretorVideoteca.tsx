import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

  if (isLoading) {
    return (
      <CorretorLayout>
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
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

        {Object.keys(videosPorCategoria).length === 0 ? (
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
        ) : (
          <div className="space-y-6">
            {Object.entries(videosPorCategoria).map(([categoria, videosGrupo]) => (
              <div key={categoria}>
                <h2 className="text-xl font-semibold text-gray-900 mb-4">
                  {categoria}
                </h2>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                  {videosGrupo.map((video) => (
                    <Card key={video.id} className="hover:shadow-md transition-shadow">
                      <CardHeader>
                        <div className="flex flex-col gap-3">
                          {video.thumbnail_url && (
                            <div className="aspect-video rounded-lg overflow-hidden bg-gray-100">
                              <img
                                src={video.thumbnail_url}
                                alt={video.titulo}
                                className="w-full h-full object-cover"
                              />
                            </div>
                          )}
                          
                          <div>
                            <CardTitle className="text-lg mb-2 flex items-center gap-2">
                              <Video className="w-5 h-5 text-gray-600" />
                              {video.titulo}
                            </CardTitle>
                            
                            <div className="flex items-center justify-between">
                              <Badge variant="outline">{video.categoria}</Badge>
                              
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => window.open(video.youtube_url, '_blank')}
                              >
                                <Play className="w-4 h-4 mr-2" />
                                Assistir
                              </Button>
                            </div>
                          </div>
                        </div>
                      </CardHeader>
                    </Card>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </CorretorLayout>
  );
};

export default CorretorVideoteca;