
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useParams, Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Home, ArrowLeft, Play, GraduationCap } from "lucide-react";
import { Button } from "@/components/ui/button";

const AulaModulo = () => {
  const { moduleId } = useParams();

  const { data: module, isLoading: moduleLoading } = useQuery({
    queryKey: ['aula-module', moduleId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('aula_modules')
        .select('*')
        .eq('id', moduleId)
        .single();
      
      if (error) throw error;
      return data;
    }
  });

  const { data: aulas, isLoading: aulasLoading } = useQuery({
    queryKey: ['aulas', moduleId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('aulas')
        .select('*')
        .eq('module_id', moduleId)
        .eq('ativo', true)
        .order('ordem');
      
      if (error) throw error;
      return data;
    }
  });

  const getYouTubeEmbedUrl = (url: string) => {
    const videoId = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/);
    return videoId ? `https://www.youtube.com/embed/${videoId[1]}` : url;
  };

  if (moduleLoading || aulasLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-violet-100 flex items-center justify-center">
        <div className="text-center">
          <GraduationCap className="w-12 h-12 text-redator-primary mx-auto mb-4 animate-pulse" />
          <p className="text-redator-accent">Carregando aulas...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-violet-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-redator-accent/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link to="/" className="flex items-center gap-2 text-redator-primary hover:text-redator-accent transition-colors">
                <Home className="w-5 h-5" />
                <span className="hidden sm:inline">Início</span>
              </Link>
              <Link to="/aulas" className="flex items-center gap-2 text-redator-primary hover:text-redator-accent transition-colors">
                <ArrowLeft className="w-5 h-5" />
                <span className="hidden sm:inline">Voltar às Aulas</span>
              </Link>
              <div className="hidden sm:block w-px h-6 bg-redator-accent/20"></div>
              <h1 className="text-xl sm:text-2xl font-bold text-redator-primary">
                {module?.nome}
              </h1>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {module && (
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-redator-primary mb-2">
              {module.nome}
            </h2>
            <p className="text-redator-accent">
              {module.descricao}
            </p>
          </div>
        )}

        {aulas && aulas.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {aulas.map((aula) => (
              <Card key={aula.id} className="border-redator-accent/20 hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <h3 className="text-lg font-semibold text-redator-primary mb-3">
                    {aula.titulo}
                  </h3>
                  
                  {aula.descricao && (
                    <p className="text-redator-accent text-sm mb-4">
                      {aula.descricao}
                    </p>
                  )}

                  {aula.youtube_url && (
                    <div className="aspect-video mb-4 rounded-lg overflow-hidden">
                      <iframe
                        src={getYouTubeEmbedUrl(aula.youtube_url)}
                        title={aula.titulo}
                        className="w-full h-full"
                        allowFullScreen
                        frameBorder="0"
                      />
                    </div>
                  )}

                  {aula.youtube_url && (
                    <Button 
                      asChild 
                      className="w-full bg-redator-secondary hover:bg-redator-secondary/90 text-white"
                    >
                      <a href={aula.youtube_url} target="_blank" rel="noopener noreferrer">
                        <Play className="w-4 h-4 mr-2" />
                        Assistir no YouTube
                      </a>
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <GraduationCap className="w-16 h-16 text-redator-accent mx-auto mb-4 opacity-50" />
            <h3 className="text-xl font-semibold text-redator-primary mb-2">
              Nenhuma aula disponível
            </h3>
            <p className="text-redator-accent mb-6">
              As aulas para este módulo ainda não foram adicionadas.
            </p>
            <Link to="/aulas">
              <Button variant="outline" className="border-redator-accent text-redator-primary hover:bg-redator-accent/10">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Voltar aos Módulos
              </Button>
            </Link>
          </div>
        )}
      </main>
    </div>
  );
};

export default AulaModulo;
