import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BookOpen } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { CorretorLayout } from "@/components/corretor/CorretorLayout";
import { useState } from "react";
import { TemaCardPadrao } from "@/components/shared/TemaCard";
import { FormattedText } from "@/components/shared/FormattedText";
import { getTemaMotivatorIVUrl } from "@/utils/temaImageUtils";

const CorretorTemas = () => {
  const [selectedTema, setSelectedTema] = useState<any>(null);

  const { data: temas, isLoading, error } = useQuery({
    queryKey: ['temas-corretor'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('temas')
        .select('*')
        .eq('status', 'publicado')
        .order('publicado_em', { ascending: false });

      if (error) throw error;
      return data || [];
    }
  });

  if (isLoading) {
    return (
      <CorretorLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Temas</h1>
            <p className="text-gray-600">Visualização dos temas disponíveis</p>
          </div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-3">
              <div className="w-full aspect-video rounded-xl bg-muted animate-pulse" />
              <div className="px-4 space-y-3">
                <div className="h-5 w-20 bg-muted rounded animate-pulse" />
                <div className="h-6 w-full bg-muted rounded animate-pulse" />
                <div className="h-4 w-24 bg-muted rounded animate-pulse" />
                <div className="h-9 w-full bg-muted rounded animate-pulse" />
              </div>
            </div>
            <div className="space-y-3">
              <div className="w-full aspect-video rounded-xl bg-muted animate-pulse" />
              <div className="px-4 space-y-3">
                <div className="h-5 w-20 bg-muted rounded animate-pulse" />
                <div className="h-6 w-full bg-muted rounded animate-pulse" />
                <div className="h-4 w-24 bg-muted rounded animate-pulse" />
                <div className="h-9 w-full bg-muted rounded animate-pulse" />
              </div>
            </div>
            <div className="space-y-3">
              <div className="w-full aspect-video rounded-xl bg-muted animate-pulse" />
              <div className="px-4 space-y-3">
                <div className="h-5 w-20 bg-muted rounded animate-pulse" />
                <div className="h-6 w-full bg-muted rounded animate-pulse" />
                <div className="h-4 w-24 bg-muted rounded animate-pulse" />
                <div className="h-9 w-full bg-muted rounded animate-pulse" />
              </div>
            </div>
          </div>
        </div>
      </CorretorLayout>
    );
  }

  if (error) {
    return (
      <CorretorLayout>
        <div className="text-center py-8">
          <p className="text-red-600">Erro ao carregar temas. Tente novamente.</p>
        </div>
      </CorretorLayout>
    );
  }

  return (
    <CorretorLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Temas</h1>
          <p className="text-gray-600">Visualização dos temas disponíveis</p>
        </div>

        {(!temas || temas.length === 0) ? (
          <Card>
            <CardContent className="text-center py-12">
              <BookOpen className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-600 mb-2">
                Nenhum tema disponível
              </h3>
              <p className="text-gray-500">
                Os temas aparecerão aqui quando forem publicados.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {temas?.map((tema) => (
              <TemaCardPadrao
                key={tema.id}
                tema={tema}
                perfil="corretor"
                actions={{
                  onVerTema: () => setSelectedTema(tema)
                }}
              />
            ))}
          </div>
        )}

        {/* Modal para visualização do tema */}
        <Dialog open={!!selectedTema} onOpenChange={() => setSelectedTema(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold text-center mb-2">
                {selectedTema?.frase_tematica}
              </DialogTitle>
              <DialogDescription className="sr-only">
                Visualização completa do tema de redação com textos motivadores
              </DialogDescription>
              {selectedTema?.eixo_tematico && (
                <div className="text-center">
                  <Badge variant="secondary" className="mb-4">
                    {selectedTema.eixo_tematico}
                  </Badge>
                </div>
              )}
            </DialogHeader>

            <div className="space-y-6">
              {/* Cabeçalho padrão */}
              <div className="bg-gray-50 rounded-lg p-6 border-l-4 border-primary">
                <p className="text-gray-700 leading-relaxed text-justify indent-8">
                  A partir da leitura dos textos motivadores e com base nos conhecimentos construídos ao longo de sua formação,
                  redija texto dissertativo-argumentativo em modalidade escrita formal da língua portuguesa sobre o tema <strong>"{selectedTema?.frase_tematica}"</strong>,
                  apresentando proposta de intervenção que respeite os direitos humanos. Selecione, organize e relacione,
                  de forma coerente e coesa, argumentos e fatos para defesa de seu ponto de vista.
                </p>
              </div>

              {/* Textos Motivadores */}
              {(() => {
                const textos = [selectedTema?.texto_1, selectedTema?.texto_2, selectedTema?.texto_3].filter(Boolean);
                let textoCounter = 1;

                return (
                  <>
                    {selectedTema?.texto_1 && (
                      <div className="bg-white rounded-lg p-6 border border-gray-200">
                        <h3 className="font-semibold text-gray-900 mb-3">Texto {textoCounter++}</h3>
                        <div className="text-gray-700">
                          <FormattedText text={selectedTema.texto_1} />
                        </div>
                      </div>
                    )}

                    {selectedTema?.texto_2 && (
                      <div className="bg-white rounded-lg p-6 border border-gray-200">
                        <h3 className="font-semibold text-gray-900 mb-3">Texto {textoCounter++}</h3>
                        <div className="text-gray-700">
                          <FormattedText text={selectedTema.texto_2} />
                        </div>
                      </div>
                    )}

                    {selectedTema?.texto_3 && (
                      <div className="bg-white rounded-lg p-6 border border-gray-200">
                        <h3 className="font-semibold text-gray-900 mb-3">Texto {textoCounter++}</h3>
                        <div className="text-gray-700">
                          <FormattedText text={selectedTema.texto_3} />
                        </div>
                      </div>
                    )}

                    {/* Texto 4 (Imagem) */}
                    {getTemaMotivatorIVUrl({
                      motivator4_source: selectedTema?.motivator4_source,
                      motivator4_url: selectedTema?.motivator4_url,
                      motivator4_file_path: selectedTema?.motivator4_file_path,
                      imagem_texto_4_url: selectedTema?.imagem_texto_4_url
                    }) && (
                      <div className="bg-white rounded-lg p-6 border border-gray-200">
                        <h3 className="font-semibold text-gray-900 mb-3">Texto {textoCounter}</h3>
                        <div className="rounded-lg overflow-hidden">
                          <img
                            src={getTemaMotivatorIVUrl({
                              motivator4_source: selectedTema?.motivator4_source,
                              motivator4_url: selectedTema?.motivator4_url,
                              motivator4_file_path: selectedTema?.motivator4_file_path,
                              imagem_texto_4_url: selectedTema?.imagem_texto_4_url
                            })!}
                            alt="Charge/Infográfico — Texto 4"
                            className="w-full h-auto"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.style.display = 'none';
                            }}
                          />
                        </div>
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </CorretorLayout>
  );
};

export default CorretorTemas;