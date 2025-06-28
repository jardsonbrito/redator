
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
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-violet-100 flex items-center justify-center">
        <div>Carregando tema...</div>
      </div>
    );
  }

  if (error || !tema) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-violet-100 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-redator-primary mb-2">Tema não encontrado</h2>
          <p className="text-redator-accent mb-4">O tema solicitado não foi encontrado.</p>
          <Link to="/temas" className="text-redator-accent hover:text-redator-primary">
            Voltar para temas
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
              <Link to="/temas" className="flex items-center gap-2 text-redator-accent hover:text-redator-primary transition-colors">
                <ArrowLeft className="w-5 h-5" />
                <span>Voltar</span>
              </Link>
              <div>
                {tema.eixo_tematico && (
                  <span className="text-sm font-medium text-white bg-redator-accent px-2 py-1 rounded">
                    {tema.eixo_tematico}
                  </span>
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
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card className="border-redator-accent/20">
          <CardContent className="p-8">
            {/* 1. Frase Temática */}
            <h1 className="text-2xl font-bold text-redator-primary mb-8 leading-tight">
              {tema.frase_tematica}
            </h1>

            <div className="space-y-6">
              {/* 2. Imagem ampliada (sem rótulo técnico) */}
              {tema.imagem_texto_4_url && (
                <div className="rounded-lg overflow-hidden mb-6">
                  <img 
                    src={tema.imagem_texto_4_url} 
                    alt="Imagem do tema"
                    className="w-full h-auto"
                  />
                </div>
              )}

              {/* 3. Cabeçalho padrão */}
              <div className="bg-redator-primary/5 rounded-lg p-6 border-l-4 border-redator-primary">
                <p className="text-redator-primary leading-relaxed font-medium">
                  A partir da leitura dos textos motivadores e com base nos conhecimentos construídos ao longo de sua formação, 
                  redija texto dissertativo-argumentativo em modalidade escrita formal da língua portuguesa sobre o tema "{tema.frase_tematica}", 
                  apresentando proposta de intervenção que respeite os direitos humanos. Selecione, organize e relacione, 
                  de forma coerente e coesa, argumentos e fatos para defesa de seu ponto de vista.
                </p>
              </div>

              {/* 4. Texto Motivador 1 */}
              {tema.texto_1 && (
                <div className="bg-white rounded-lg p-6 border border-redator-accent/20">
                  <h3 className="font-semibold text-redator-primary mb-3">Texto Motivador I</h3>
                  <p className="text-redator-accent leading-relaxed">
                    {tema.texto_1}
                  </p>
                </div>
              )}

              {/* 5. Texto Motivador 2 */}
              {tema.texto_2 && (
                <div className="bg-white rounded-lg p-6 border border-redator-accent/20">
                  <h3 className="font-semibold text-redator-primary mb-3">Texto Motivador II</h3>
                  <p className="text-redator-accent leading-relaxed">
                    {tema.texto_2}
                  </p>
                </div>
              )}

              {/* 6. Texto Motivador 3 */}
              {tema.texto_3 && (
                <div className="bg-white rounded-lg p-6 border border-redator-accent/20">
                  <h3 className="font-semibold text-redator-primary mb-3">Texto Motivador III</h3>
                  <p className="text-redator-accent leading-relaxed">
                    {tema.texto_3}
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default TemaDetalhes;
