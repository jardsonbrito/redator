
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const Temas = () => {
  const { data: temas, isLoading, error } = useQuery({
    queryKey: ['temas'],
    queryFn: async () => {
      console.log('Fetching temas...');
      const { data, error } = await supabase
        .from('temas')
        .select('*')
        .order('publicado_em', { ascending: false });
      
      if (error) {
        console.error('Error fetching temas:', error);
        throw error;
      }
      
      console.log('Temas fetched:', data);
      return data;
    },
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center">
        <div>Carregando temas...</div>
      </div>
    );
  }

  if (error) {
    console.error('Error in Temas component:', error);
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center">
        <div>Erro ao carregar temas. Verifique o console para mais detalhes.</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-4">
            <Link to="/" className="flex items-center gap-2 text-green-600 hover:text-green-700 transition-colors">
              <ArrowLeft className="w-5 h-5" />
              <span>Voltar</span>
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Temas</h1>
              <p className="text-gray-600">Propostas de redação organizadas por eixo temático</p>
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {temas && temas.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {temas.map((tema) => {
              console.log('Rendering tema:', tema);
              return (
                <Link key={tema.id} to={`/temas/${tema.id}`} className="group">
                  <Card className="h-full transition-all duration-300 hover:shadow-lg hover:scale-105 cursor-pointer">
                    <div className="aspect-video overflow-hidden rounded-t-lg">
                      <img 
                        src={tema.imagem_texto_4_url || "https://images.unsplash.com/photo-1449824913935-59a10b8d2000?w=300&h=200&fit=crop"} 
                        alt={tema.frase_tematica || "Tema"}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                      />
                    </div>
                    <CardContent className="p-4">
                      {tema.eixo_tematico && (
                        <div className="mb-2">
                          <span className="text-xs font-medium text-green-600 bg-green-100 px-2 py-1 rounded">
                            {tema.eixo_tematico}
                          </span>
                        </div>
                      )}
                      {tema.frase_tematica && (
                        <h3 className="font-semibold text-gray-900 line-clamp-2 group-hover:text-green-600 transition-colors">
                          {tema.frase_tematica}
                        </h3>
                      )}
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-600">Nenhum tema encontrado. Adicione temas através do painel administrativo.</p>
          </div>
        )}
      </main>
    </div>
  );
};

export default Temas;
