
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

// Type extension para incluir o campo imagem_texto_4_url
type TemaWithImage = {
  id: string;
  frase_tematica: string;
  eixo_tematico: string;
  texto_1: string | null;
  texto_2: string | null;
  texto_3: string | null;
  imagem_texto_4_url: string | null;
  publicado_em: string | null;
};

const Temas = () => {
  const { data: temas, isLoading, error } = useQuery({
    queryKey: ['temas'],
    queryFn: async () => {
      console.log('Buscando temas no Supabase...');
      const { data, error } = await supabase
        .from('temas')
        .select('*')
        .order('publicado_em', { ascending: false });
      
      if (error) {
        console.error('Erro ao buscar temas:', error);
        throw error;
      }
      
      console.log('Temas encontrados:', data?.length || 0);
      console.log('Dados dos temas:', data);
      return (data || []) as TemaWithImage[];
    },
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-violet-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-redator-accent mx-auto mb-4"></div>
          <p className="text-redator-accent">Carregando temas do banco de dados...</p>
        </div>
      </div>
    );
  }

  if (error) {
    console.error('Erro na página Temas:', error);
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-violet-100 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-red-600 mb-2">❌ Erro ao carregar temas</h2>
          <p className="text-redator-accent mb-4">Erro: {error.message}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="bg-redator-accent text-white px-4 py-2 rounded hover:bg-redator-accent/90"
          >
            Tentar novamente
          </button>
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
              <Link to="/" className="flex items-center gap-2 text-redator-accent hover:text-redator-primary transition-colors">
                <ArrowLeft className="w-5 h-5" />
                <span>Voltar</span>
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-redator-primary">Temas</h1>
                <p className="text-redator-accent">Propostas de redação organizadas por eixo temático</p>
                {temas && (
                  <p className="text-sm text-redator-secondary">
                    ✅ {temas.length} tema{temas.length !== 1 ? 's' : ''} encontrado{temas.length !== 1 ? 's' : ''}
                  </p>
                )}
              </div>
            </div>
            <Link to="/" className="hover:opacity-80 transition-opacity">
              <img src="/lovable-uploads/e8f3c7a9-a9bb-43ac-ba3d-e625d15834d8.png" alt="App do Redator - Voltar para Home" className="h-8 w-auto max-w-[120px] object-contain" />
            </Link>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {temas && temas.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {temas.map((tema) => {
              console.log('Renderizando tema:', {
                id: tema.id,
                frase_tematica: tema.frase_tematica,
                eixo_tematico: tema.eixo_tematico,
                imagem_url: tema.imagem_texto_4_url
              });
              
              return (
                <Link key={tema.id} to={`/temas/${tema.id}`} className="group">
                  <Card className="h-full transition-all duration-300 hover:shadow-lg hover:scale-105 cursor-pointer border-redator-accent/20 hover:border-redator-secondary/50">
                    <div className="aspect-video overflow-hidden rounded-t-lg">
                      <img 
                        src={tema.imagem_texto_4_url || "https://images.unsplash.com/photo-1449824913935-59a10b8d2000?w=400&h=300&fit=crop"} 
                        alt={tema.frase_tematica || "Tema de redação"}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                        onError={(e) => {
                          console.log('Erro ao carregar imagem, usando fallback');
                          e.currentTarget.src = "https://images.unsplash.com/photo-1449824913935-59a10b8d2000?w=400&h=300&fit=crop";
                        }}
                      />
                    </div>
                    <CardContent className="p-4">
                      {tema.eixo_tematico && (
                        <div className="mb-2">
                          <span className="text-xs font-medium text-white bg-redator-accent px-2 py-1 rounded">
                            {tema.eixo_tematico}
                          </span>
                        </div>
                      )}
                      {tema.frase_tematica && (
                        <h3 className="font-semibold text-redator-primary line-clamp-2 group-hover:text-redator-accent transition-colors">
                          {tema.frase_tematica}
                        </h3>
                      )}
                      <div className="mt-2 text-xs text-redator-accent">
                        📅 {new Date(tema.publicado_em).toLocaleDateString('pt-BR')}
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">📝</div>
            <h3 className="text-xl font-semibold text-redator-primary mb-2">Nenhum tema encontrado</h3>
            <p className="text-redator-accent mb-4">
              Os temas de redação ainda não foram cadastrados no banco de dados.
            </p>
            <p className="text-sm text-redator-accent/70">
              ℹ️ Use o painel administrativo para adicionar novos temas.
            </p>
          </div>
        )}
      </main>
    </div>
  );
};

export default Temas;
