import { useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { CorretorLayout } from "@/components/corretor/CorretorLayout";
import { FormattedText } from '@/components/shared/FormattedText';
import { useCorretorNavigationContext } from "@/hooks/useCorretorNavigationContext";

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
  const { setBreadcrumbs, setPageTitle } = useCorretorNavigationContext();
  
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

  // Configurar breadcrumbs e título quando o tema for carregado
  useEffect(() => {
    if (tema?.frase_tematica) {
      setBreadcrumbs([
        { label: 'Dashboard', href: '/corretor' },
        { label: 'Temas', href: '/corretor/temas' },
        { label: tema.frase_tematica }
      ]);
      setPageTitle(tema.frase_tematica);
    }
  }, [tema?.frase_tematica, setBreadcrumbs, setPageTitle]);

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
            <div className="space-y-6">
              {/* 1. Imagem de destaque no topo */}
              {tema.imagem_texto_4_url && (
                <div className="rounded-lg overflow-hidden mb-6">
                  <img
                    src={tema.imagem_texto_4_url}
                    alt="Imagem do tema"
                    className="w-full h-auto"
                  />
                </div>
              )}

              {/* 2. Cabeçalho padrão */}
              <div className="bg-primary/5 rounded-lg p-6 border-l-4 border-primary">
                <p className="text-foreground leading-relaxed font-medium text-justify indent-8">
                  A partir da leitura dos textos motivadores e com base nos conhecimentos construídos ao longo de sua formação,
                  redija texto dissertativo-argumentativo em modalidade escrita formal da língua portuguesa sobre o tema <span className="font-bold text-lg">"</span><span className="font-bold text-lg">{tema.frase_tematica}</span><span className="font-bold text-lg">"</span>,
                  apresentando proposta de intervenção que respeite os direitos humanos. Selecione, organize e relacione,
                  de forma coerente e coesa, argumentos e fatos para defesa de seu ponto de vista.
                </p>
              </div>

              {/* 3. Textos Motivadores */}
              {(() => {
                let textoCounter = 1;

                return (
                  <>
                    {tema.texto_1 && (
                      <div className="bg-white rounded-lg p-6 border border-muted">
                        <h3 className="font-semibold text-foreground mb-3">Texto {textoCounter++}</h3>
                        <div className="text-muted-foreground">
                          <FormattedText text={tema.texto_1} />
                        </div>
                      </div>
                    )}

                    {tema.texto_2 && (
                      <div className="bg-white rounded-lg p-6 border border-muted">
                        <h3 className="font-semibold text-foreground mb-3">Texto {textoCounter++}</h3>
                        <div className="text-muted-foreground">
                          <FormattedText text={tema.texto_2} />
                        </div>
                      </div>
                    )}

                    {tema.texto_3 && (
                      <div className="bg-white rounded-lg p-6 border border-muted">
                        <h3 className="font-semibold text-foreground mb-3">Texto {textoCounter++}</h3>
                        <div className="text-muted-foreground">
                          <FormattedText text={tema.texto_3} />
                        </div>
                      </div>
                    )}

                    {/* Texto 4 (Imagem) - como card separado para identificação */}
                    {tema.imagem_texto_4_url && (
                      <div className="bg-white rounded-lg p-6 border border-muted">
                        <h3 className="font-semibold text-foreground mb-3">Texto {textoCounter}</h3>
                        <p className="text-sm text-muted-foreground mb-3">
                          (Esta imagem também aparece como capa do tema)
                        </p>
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
          </CardContent>
        </Card>
      </div>
    </CorretorLayout>
  );
};

export default CorretorTemaDetalhes;