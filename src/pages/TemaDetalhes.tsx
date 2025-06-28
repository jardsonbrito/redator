
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import { Link, useParams } from "react-router-dom";
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

const TemaDetalhes = () => {
  const { id } = useParams();
  
  const { data: tema, isLoading, error } = useQuery({
    queryKey: ['tema', id],
    queryFn: async () => {
      console.log('Fetching tema details for id:', id);
      const { data, error } = await supabase
        .from('temas')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) {
        console.error('Error fetching tema:', error);
        throw error;
      }
      
      console.log('Tema details fetched:', data);
      return data as TemaWithImage;
    },
    enabled: !!id
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center">
        <div>Carregando tema...</div>
      </div>
    );
  }

  if (error || !tema) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Tema não encontrado</h2>
          <p className="text-gray-600 mb-4">O tema solicitado não foi encontrado.</p>
          <Link to="/temas" className="text-green-600 hover:text-green-700">
            Voltar para temas
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-4">
            <Link to="/temas" className="flex items-center gap-2 text-green-600 hover:text-green-700 transition-colors">
              <ArrowLeft className="w-5 h-5" />
              <span>Voltar</span>
            </Link>
            <div>
              {tema.eixo_tematico && (
                <span className="text-sm font-medium text-green-600 bg-green-100 px-2 py-1 rounded">
                  {tema.eixo_tematico}
                </span>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card>
          <CardContent className="p-8">
            <h1 className="text-2xl font-bold text-gray-900 mb-8 leading-tight">
              {tema.frase_tematica}
            </h1>

            <div className="space-y-6">
              {/* Texto Motivador 1 */}
              {tema.texto_1 && (
                <div className="bg-gray-50 rounded-lg p-6">
                  <h3 className="font-semibold text-gray-900 mb-3">Texto Motivador I</h3>
                  <p className="text-gray-700 leading-relaxed">
                    {tema.texto_1}
                  </p>
                </div>
              )}

              {/* Texto Motivador 2 */}
              {tema.texto_2 && (
                <div className="bg-gray-50 rounded-lg p-6">
                  <h3 className="font-semibold text-gray-900 mb-3">Texto Motivador II</h3>
                  <p className="text-gray-700 leading-relaxed">
                    {tema.texto_2}
                  </p>
                </div>
              )}

              {/* Texto Motivador 3 */}
              {tema.texto_3 && (
                <div className="bg-gray-50 rounded-lg p-6">
                  <h3 className="font-semibold text-gray-900 mb-3">Texto Motivador III</h3>
                  <p className="text-gray-700 leading-relaxed">
                    {tema.texto_3}
                  </p>
                </div>
              )}

              {/* Imagem Motivadora */}
              {tema.imagem_texto_4_url && (
                <div className="bg-gray-50 rounded-lg p-6">
                  <h3 className="font-semibold text-gray-900 mb-3">Texto Motivador IV</h3>
                  <div className="rounded-lg overflow-hidden">
                    <img 
                      src={tema.imagem_texto_4_url} 
                      alt="Imagem motivadora do tema"
                      className="w-full h-auto"
                    />
                  </div>
                </div>
              )}

              {/* Proposta */}
              <div className="bg-green-50 rounded-lg p-6 border-l-4 border-green-500">
                <h3 className="font-bold text-green-900 mb-3">📝 Proposta de Redação</h3>
                <p className="text-green-800 leading-relaxed">
                  A partir da leitura dos textos motivadores e com base nos conhecimentos construídos ao longo de sua formação, 
                  redija texto dissertativo-argumentativo em modalidade escrita formal da língua portuguesa sobre o tema "{tema.frase_tematica}", 
                  apresentando proposta de intervenção que respeite os direitos humanos. Selecione, organize e relacione, 
                  de forma coerente e coesa, argumentos e fatos para defesa de seu ponto de vista.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default TemaDetalhes;
