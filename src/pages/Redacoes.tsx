
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const Redacoes = () => {
  const { data: redacoes, isLoading } = useQuery({
    queryKey: ['redacoes'],
    queryFn: async () => {
      console.log('Fetching redacoes...');
      const { data, error } = await supabase
        .from('redacoes')
        .select(`
          *,
          temas (
            frase_tematica,
            eixo_tematico
          )
        `)
        .order('data_envio', { ascending: false });
      
      if (error) {
        console.error('Error fetching redacoes:', error);
        throw error;
      }
      
      console.log('Redacoes fetched:', data);
      return data;
    }
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div>Carregando redações...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-4">
            <Link to="/" className="flex items-center gap-2 text-blue-600 hover:text-blue-700 transition-colors">
              <ArrowLeft className="w-5 h-5" />
              <span>Voltar</span>
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Redações Exemplares</h1>
              <p className="text-gray-600">Aprenda com redações nota 1000</p>
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {redacoes && redacoes.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {redacoes.map((redacao) => {
              console.log('Rendering redacao:', redacao);
              return (
                <Link key={redacao.id} to={`/redacoes/${redacao.id}`} className="group">
                  <Card className="h-full transition-all duration-300 hover:shadow-lg hover:scale-105 cursor-pointer">
                    <div className="aspect-video overflow-hidden rounded-t-lg">
                      <img 
                        src={redacao.pdf_url || "https://images.unsplash.com/photo-1486312338219-ce68d2c6f44d?w=300&h=200&fit=crop"} 
                        alt={redacao.temas?.frase_tematica || "Redação"}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                      />
                    </div>
                    <CardContent className="p-4">
                      {redacao.temas?.eixo_tematico && (
                        <div className="mb-2">
                          <span className="text-xs font-medium text-blue-600 bg-blue-100 px-2 py-1 rounded">
                            {redacao.temas.eixo_tematico}
                          </span>
                        </div>
                      )}
                      {redacao.temas?.frase_tematica && (
                        <h3 className="font-semibold text-gray-900 line-clamp-2 group-hover:text-blue-600 transition-colors">
                          {redacao.temas.frase_tematica}
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
            <p className="text-gray-600">Nenhuma redação encontrada. Adicione redações através do painel administrativo.</p>
          </div>
        )}
      </main>
    </div>
  );
};

export default Redacoes;
