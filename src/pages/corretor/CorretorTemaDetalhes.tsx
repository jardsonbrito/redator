import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { CorretorLayout } from "@/components/corretor/CorretorLayout";
import { renderTextWithParagraphs } from '@/utils/textUtils';

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

const CorretorTemaDetalhes = () => {
  const { id } = useParams();
  
  const { data: tema, isLoading, error } = useQuery({
    queryKey: ['corretor-tema', id],
    queryFn: async () => {
      console.log('Fetching tema details for corretor, id:', id);
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
      <CorretorLayout>
        <div className="flex items-center justify-center py-8">
          <div>Carregando tema...</div>
        </div>
      </CorretorLayout>
    );
  }

  if (error || !tema) {
    return (
      <CorretorLayout>
        <div className="text-center py-8">
          <h2 className="text-xl font-semibold text-foreground mb-2">Tema não encontrado</h2>
          <p className="text-muted-foreground mb-4">O tema solicitado não foi encontrado.</p>
          <Link to="/corretor/temas" className="text-primary hover:text-primary/80">
            Voltar para temas
          </Link>
        </div>
      </CorretorLayout>
    );
  }

  return (
    <CorretorLayout>
      <div className="space-y-6">
        {/* Header com botão voltar */}
        <div className="flex items-center gap-4">
          <Button variant="outline" asChild>
            <Link to="/corretor/temas">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar para Temas
            </Link>
          </Button>
          {tema.eixo_tematico && (
            <span className="text-sm font-medium text-white bg-primary px-3 py-1 rounded">
              {tema.eixo_tematico}
            </span>
          )}
        </div>

        {/* Content */}
        <Card className="border-primary/20">
          <CardContent className="p-8">
            {/* 1. Frase Temática */}
            <h1 className="text-2xl font-bold text-foreground mb-8 leading-tight">
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
              <div className="bg-primary/5 rounded-lg p-6 border-l-4 border-primary">
                <p className="text-foreground leading-relaxed font-medium">
                  A partir da leitura dos textos motivadores e com base nos conhecimentos construídos ao longo de sua formação, 
                  redija texto dissertativo-argumentativo em modalidade escrita formal da língua portuguesa sobre o tema "{tema.frase_tematica}", 
                  apresentando proposta de intervenção que respeite os direitos humanos. Selecione, organize e relacione, 
                  de forma coerente e coesa, argumentos e fatos para defesa de seu ponto de vista.
                </p>
              </div>

              {/* 4. Texto Motivador 1 */}
              {tema.texto_1 && (
                <div className="bg-white rounded-lg p-6 border border-muted">
                  <h3 className="font-semibold text-foreground mb-3">Texto Motivador I</h3>
                  <div className="text-muted-foreground leading-relaxed">
                    {renderTextWithParagraphs(tema.texto_1)}
                  </div>
                </div>
              )}

              {/* 5. Texto Motivador 2 */}
              {tema.texto_2 && (
                <div className="bg-white rounded-lg p-6 border border-muted">
                  <h3 className="font-semibold text-foreground mb-3">Texto Motivador II</h3>
                  <div className="text-muted-foreground leading-relaxed">
                    {renderTextWithParagraphs(tema.texto_2)}
                  </div>
                </div>
              )}

              {/* 6. Texto Motivador 3 */}
              {tema.texto_3 && (
                <div className="bg-white rounded-lg p-6 border border-muted">
                  <h3 className="font-semibold text-foreground mb-3">Texto Motivador III</h3>
                  <div className="text-muted-foreground leading-relaxed">
                    {renderTextWithParagraphs(tema.texto_3)}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </CorretorLayout>
  );
};

export default CorretorTemaDetalhes;