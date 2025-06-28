
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Play } from "lucide-react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

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
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p>Carregando vídeos do banco de dados...</p>
        </div>
      </div>
    );
  }

  if (error) {
    console.error('Erro na página Videoteca:', error);
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-100 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-red-600 mb-2">❌ Erro ao carregar vídeos</h2>
          <p className="text-gray-600 mb-4">Erro: {error.message}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700"
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-4">
            <Link to="/" className="flex items-center gap-2 text-purple-600 hover:text-purple-700 transition-colors">
              <ArrowLeft className="w-5 h-5" />
              <span>Voltar</span>
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Videoteca</h1>
              <p className="text-gray-600">Assista conteúdos sobre escrita e repertório</p>
              {videos && (
                <p className="text-sm text-purple-600">
                  ✅ {videos.length} vídeo{videos.length !== 1 ? 's' : ''} encontrado{videos.length !== 1 ? 's' : ''}
                </p>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {videos && videos.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {videos.map((video) => {
              console.log('Renderizando vídeo:', {
                id: video.id,
                titulo: video.titulo,
                categoria: video.categoria,
                thumbnail: video.thumbnail_url,
                youtube_url: video.youtube_url
              });
              
              return (
                <div key={video.id} className="group cursor-pointer" onClick={() => openVideo(video.youtube_url)}>
                  <Card className="h-full transition-all duration-300 hover:shadow-lg hover:scale-105">
                    <div className="aspect-video overflow-hidden rounded-t-lg relative">
                      <img 
                        src={video.thumbnail_url || "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=400&h=300&fit=crop"} 
                        alt={video.titulo || "Vídeo educativo"}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                        onError={(e) => {
                          console.log('Erro ao carregar thumbnail, usando fallback');
                          e.currentTarget.src = "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=400&h=300&fit=crop";
                        }}
                      />
                      <div className="absolute inset-0 bg-black bg-opacity-30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <Play className="w-12 h-12 text-white" />
                      </div>
                      <div className="absolute top-2 right-2 bg-red-600 text-white text-xs px-2 py-1 rounded">
                        YouTube
                      </div>
                    </div>
                    <CardContent className="p-4">
                      {video.categoria && (
                        <div className="mb-2">
                          <span className="text-xs font-medium text-purple-600 bg-purple-100 px-2 py-1 rounded">
                            {video.categoria}
                          </span>
                        </div>
                      )}
                      {video.titulo && (
                        <h3 className="font-semibold text-gray-900 line-clamp-2 group-hover:text-purple-600 transition-colors">
                          {video.titulo}
                        </h3>
                      )}
                      <div className="mt-2 text-xs text-gray-500">
                        📅 {new Date(video.created_at).toLocaleDateString('pt-BR')}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🎥</div>
            <h3 className="text-xl font-semibold text-gray-700 mb-2">Nenhum vídeo encontrado</h3>
            <p className="text-gray-600 mb-4">
              Os vídeos educativos ainda não foram cadastrados no banco de dados.
            </p>
            <p className="text-sm text-gray-500">
              ℹ️ Use o painel administrativo para adicionar novos vídeos à videoteca.
            </p>
          </div>
        )}
      </main>
    </div>
  );
};

export default Videoteca;
