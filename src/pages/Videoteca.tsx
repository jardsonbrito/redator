
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Play } from "lucide-react";
import { Link } from "react-router-dom";

const Videoteca = () => {
  // Mock data - será substituído pelos dados do Supabase
  const videos = [
    {
      id: 1,
      assunto: "Como estruturar uma redação dissertativo-argumentativa",
      link_youtube: "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
    },
    {
      id: 2,
      assunto: "Técnicas de argumentação: como convencer o leitor",
      link_youtube: "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
    },
    {
      id: 3,
      assunto: "A importância da proposta de intervenção no ENEM",
      link_youtube: "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
    },
    {
      id: 4,
      assunto: "Coesão e coerência textual: conectivos e progressão temática",
      link_youtube: "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
    },
    {
      id: 5,
      assunto: "Como evitar clichês e frases feitas na redação",
      link_youtube: "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
    },
    {
      id: 6,
      assunto: "Análise de redações nota 1000: o que as torna especiais",
      link_youtube: "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
    }
  ];

  // Função para extrair o ID do vídeo do YouTube
  const getYouTubeId = (url: string) => {
    const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/);
    return match ? match[1] : null;
  };

  // Função para gerar thumbnail do YouTube
  const getYouTubeThumbnail = (url: string) => {
    const videoId = getYouTubeId(url);
    return videoId ? `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg` : null;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-violet-100">
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
              <p className="text-gray-600">Vídeos educativos sobre técnicas de redação</p>
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {videos.map((video) => {
            const thumbnailUrl = getYouTubeThumbnail(video.link_youtube);
            
            return (
              <a 
                key={video.id} 
                href={video.link_youtube} 
                target="_blank" 
                rel="noopener noreferrer"
                className="group"
              >
                <Card className="h-full transition-all duration-300 hover:shadow-lg hover:scale-105 cursor-pointer">
                  <div className="aspect-video overflow-hidden rounded-t-lg relative">
                    {thumbnailUrl ? (
                      <img 
                        src={thumbnailUrl} 
                        alt={video.assunto}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                        <Play className="w-12 h-12 text-gray-400" />
                      </div>
                    )}
                    
                    {/* Play button overlay */}
                    <div className="absolute inset-0 bg-black bg-opacity-20 flex items-center justify-center group-hover:bg-opacity-30 transition-all duration-300">
                      <div className="bg-red-600 rounded-full p-3 group-hover:scale-110 transition-transform duration-300">
                        <Play className="w-6 h-6 text-white fill-current" />
                      </div>
                    </div>
                  </div>
                  
                  <CardContent className="p-4">
                    <h3 className="font-semibold text-gray-900 line-clamp-2 group-hover:text-purple-600 transition-colors">
                      {video.assunto}
                    </h3>
                    <div className="mt-2 flex items-center gap-2 text-sm text-gray-500">
                      <Play className="w-4 h-4" />
                      <span>Assistir no YouTube</span>
                    </div>
                  </CardContent>
                </Card>
              </a>
            );
          })}
        </div>
      </main>
    </div>
  );
};

export default Videoteca;
