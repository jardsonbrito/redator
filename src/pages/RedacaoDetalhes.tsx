import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Lightbulb } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const RedacaoDetalhes = () => {
  const { id } = useParams();
  
  const { data: redacao, isLoading, error } = useQuery({
    queryKey: ['redacao', id],
    queryFn: async () => {
      console.log('Fetching redacao details for id:', id);
      const { data, error } = await supabase
        .from('redacoes')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) {
        console.error('Error fetching redacao:', error);
        throw error;
      }
      
      console.log('Redacao details fetched:', data);
      return data;
    },
    enabled: !!id
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-violet-100 flex items-center justify-center">
        <div>Carregando redação...</div>
      </div>
    );
  }

  if (error || !redacao) {
    console.error('Error or no redacao found:', error, redacao);
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-violet-100 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-redator-primary mb-2">Redação não encontrada</h2>
          <p className="text-redator-accent mb-4">A redação solicitada não foi encontrada.</p>
          <Link to="/redacoes" className="text-redator-accent hover:text-redator-primary">
            Voltar para redações
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-violet-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-redator-accent/20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link to="/redacoes" className="flex items-center gap-2 text-redator-accent hover:text-redator-primary transition-colors">
                <ArrowLeft className="w-5 h-5" />
                <span>Voltar</span>
              </Link>
              <div>
                {redacao.eixo_tematico && (
                  <span className="text-sm font-medium text-white bg-redator-primary px-2 py-1 rounded">
                    {redacao.eixo_tematico}
                  </span>
                )}
              </div>
            </div>
            <Link to="/" className="hover:opacity-80 transition-opacity">
              <img src="/lovable-uploads/e8f3c7a9-a9bb-43ac-ba3d-e625d15834d8.png" alt="App do Redator - Voltar para Home" className="h-12 w-auto" />
            </Link>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card className="border-redator-accent/20">
          <CardContent className="p-8">
            <h1 className="text-2xl font-bold text-redator-primary mb-6 leading-tight">
              {redacao.frase_tematica || "Redação Exemplar"}
            </h1>
            
            <div className="prose prose-lg max-w-none">
              {redacao.conteudo && redacao.conteudo.split('\n\n').map((paragrafo, index) => (
                <p key={index} className="mb-4 text-gray-700 leading-relaxed">
                  {paragrafo}
                </p>
              ))}
            </div>

            {/* Dica de Escrita */}
            {redacao.dica_de_escrita && (
              <div className="mt-8 p-6 bg-amber-50 rounded-lg border-l-4 border-amber-400">
                <h3 className="font-semibold text-redator-primary mb-3 flex items-center gap-2">
                  <Lightbulb className="w-5 h-5 text-amber-500" />
                  Dica de Escrita
                </h3>
                <p className="text-redator-accent leading-relaxed">
                  {redacao.dica_de_escrita}
                </p>
              </div>
            )}

            {redacao.nota_total && (
              <div className="mt-6 p-4 bg-white rounded-lg border border-redator-accent/20">
                <h3 className="font-semibold text-redator-primary mb-2">📊 Nota Total: {redacao.nota_total}</h3>
                <div className="grid grid-cols-5 gap-2 text-sm text-redator-accent">
                  {redacao.nota_c1 && <div>C1: {redacao.nota_c1}</div>}
                  {redacao.nota_c2 && <div>C2: {redacao.nota_c2}</div>}
                  {redacao.nota_c3 && <div>C3: {redacao.nota_c3}</div>}
                  {redacao.nota_c4 && <div>C4: {redacao.nota_c4}</div>}
                  {redacao.nota_c5 && <div>C5: {redacao.nota_c5}</div>}
                </div>
              </div>
            )}

            <div className="mt-8 pt-6 border-t border-redator-accent/20">
              <div className="bg-white rounded-lg p-4 border border-redator-accent/20">
                <h3 className="font-semibold text-redator-primary mb-2">💡 Dica de Estudo</h3>
                <p className="text-redator-accent text-sm">
                  Observe como esta redação desenvolve cada argumento com exemplos concretos e conecta as ideias de forma coesa. 
                  Pratique identificando a tese, os argumentos e a conclusão.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default RedacaoDetalhes;
