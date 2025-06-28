
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const Redacoes = () => {
  const { data: redacoes, isLoading, error } = useQuery({
    queryKey: ['redacoes'],
    queryFn: async () => {
      console.log('Buscando redações exemplares...');
      const { data, error } = await supabase
        .from('redacoes')
        .select('*')
        .order('data_envio', { ascending: false });
      
      if (error) {
        console.error('Erro ao buscar redações:', error);
        throw error;
      }
      
      console.log('Redações encontradas:', data?.length || 0);
      return data || [];
    },
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-violet-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-redator-primary mx-auto mb-4"></div>
          <p className="text-redator-accent">Carregando redações exemplares...</p>
        </div>
      </div>
    );
  }

  if (error) {
    console.error('Erro na página Redações:', error);
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-violet-100 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-red-600 mb-2">❌ Erro ao carregar redações</h2>
          <p className="text-redator-accent mb-4">Erro: {error.message}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="bg-redator-primary text-white px-4 py-2 rounded hover:bg-redator-primary/90"
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
              <Link to="/" className="flex items-center gap-2 text-redator-primary hover:text-redator-accent transition-colors">
                <ArrowLeft className="w-5 h-5" />
                <span>Voltar</span>
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-redator-primary">Redações Exemplares</h1>
                <p className="text-redator-accent">Aprenda com redações nota 1000</p>
                {redacoes && (
                  <p className="text-sm text-redator-secondary">
                    ✅ {redacoes.length} redação{redacoes.length !== 1 ? 'ões' : ''} exemplar{redacoes.length !== 1 ? 'es' : ''} encontrada{redacoes.length !== 1 ? 's' : ''}
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
        {redacoes && redacoes.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {redacoes.map((redacao) => {
              console.log('Renderizando redação:', {
                id: redacao.id,
                frase_tematica: redacao.frase_tematica,
                eixo_tematico: redacao.eixo_tematico,
                nota_total: redacao.nota_total,
                pdf_url: redacao.pdf_url
              });
              
              // Gerar URL de imagem única para cada redação baseada no ID
              const defaultImageUrl = `https://images.unsplash.com/photo-1486312338219-ce68d2c6f44d?w=400&h=300&fit=crop&auto=format&q=80&sig=${redacao.id}`;
              const imageUrl = redacao.pdf_url || defaultImageUrl;
              
              return (
                <Link key={redacao.id} to={`/redacoes/${redacao.id}`} className="group">
                  <Card className="h-full transition-all duration-300 hover:shadow-lg hover:scale-105 cursor-pointer border-redator-accent/20 hover:border-redator-secondary/50">
                    <div className="aspect-video overflow-hidden rounded-t-lg">
                      <img 
                        src={imageUrl}
                        alt={redacao.frase_tematica || "Redação Exemplar"}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                        key={`redacao-${redacao.id}-${imageUrl}`}
                        loading="lazy"
                        onLoad={() => console.log('Imagem carregada para redação:', redacao.id, imageUrl)}
                        onError={(e) => {
                          console.log('Erro ao carregar imagem da redação:', redacao.id, imageUrl);
                          const fallbackUrl = `https://images.unsplash.com/photo-1486312338219-ce68d2c6f44d?w=400&h=300&fit=crop&auto=format&q=80&sig=fallback-${redacao.id}`;
                          if (e.currentTarget.src !== fallbackUrl) {
                            e.currentTarget.src = fallbackUrl;
                          }
                        }}
                      />
                    </div>
                    <CardContent className="p-4">
                      <div className="mb-2">
                        <span className="text-xs font-medium text-white bg-redator-primary px-2 py-1 rounded">
                          {redacao.eixo_tematico || 'Redação Exemplar'}
                        </span>
                      </div>
                      
                      <h3 className="font-semibold text-redator-primary line-clamp-2 group-hover:text-redator-accent transition-colors mb-2">
                        {redacao.frase_tematica || 'Redação Exemplar - Nota 1000'}
                      </h3>
                      
                      <div className="flex items-center justify-between">
                        {redacao.nota_total && (
                          <span className="text-sm text-redator-secondary font-medium">
                            ⭐ Nota: {redacao.nota_total}
                          </span>
                        )}
                        <div className="text-xs text-redator-accent">
                          📅 {new Date(redacao.data_envio).toLocaleDateString('pt-BR')}
                        </div>
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
            <h3 className="text-xl font-semibold text-redator-primary mb-2">Nenhuma redação exemplar encontrada</h3>
            <p className="text-redator-accent mb-4">
              As redações exemplares ainda não foram cadastradas.
            </p>
            <p className="text-sm text-redator-accent/70">
              ℹ️ Use o painel administrativo para adicionar redações nota 1000.
            </p>
          </div>
        )}
      </main>
    </div>
  );
};

export default Redacoes;
