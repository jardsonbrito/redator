import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { BookOpen, Eye, X } from "lucide-react";
import { CorretorLayout } from "@/components/corretor/CorretorLayout";
import { useState } from "react";

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
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
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

        <div className="grid gap-4">
          {temas?.map((tema) => (
            <Card key={tema.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg mb-2">{tema.frase_tematica}</CardTitle>
                    {tema.eixo_tematico && (
                      <Badge variant="secondary">{tema.eixo_tematico}</Badge>
                    )}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedTema(tema)}
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    Ver Completo
                  </Button>
                </div>
              </CardHeader>
            </Card>
          ))}

          {(!temas || temas.length === 0) && (
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
          )}
        </div>

        {/* Modal para visualização do tema */}
        <Dialog open={!!selectedTema} onOpenChange={() => setSelectedTema(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold text-center mb-2">
                {selectedTema?.frase_tematica}
              </DialogTitle>
              {selectedTema?.eixo_tematico && (
                <div className="text-center">
                  <Badge variant="secondary" className="mb-4">
                    {selectedTema.eixo_tematico}
                  </Badge>
                </div>
              )}
            </DialogHeader>

            <div className="space-y-6">
              {selectedTema?.imagem_texto_4_url && (
                <img 
                  src={selectedTema.imagem_texto_4_url} 
                  alt="Imagem do tema"
                  className="block mx-auto max-h-[250px] w-auto object-contain rounded-md my-4"
                />
              )}

              <div className="bg-gray-50 rounded-lg p-6">
                <p className="text-gray-700 leading-relaxed text-center">
                  A partir da leitura dos textos motivadores e com base nos conhecimentos construídos ao longo de sua formação, 
                  redija texto dissertativo-argumentativo em modalidade escrita formal da língua portuguesa sobre o tema <strong>"{selectedTema?.frase_tematica}"</strong>, 
                  apresentando proposta de intervenção que respeite os direitos humanos.
                </p>
              </div>

              {selectedTema?.texto_1 && (
                <div className="border rounded-lg p-4">
                  <h3 className="font-semibold mb-2">Texto Motivador I</h3>
                  <p className="text-gray-700">{selectedTema.texto_1}</p>
                </div>
              )}

              {selectedTema?.texto_2 && (
                <div className="border rounded-lg p-4">
                  <h3 className="font-semibold mb-2">Texto Motivador II</h3>
                  <p className="text-gray-700">{selectedTema.texto_2}</p>
                </div>
              )}

              {selectedTema?.texto_3 && (
                <div className="border rounded-lg p-4">
                  <h3 className="font-semibold mb-2">Texto Motivador III</h3>
                  <p className="text-gray-700">{selectedTema.texto_3}</p>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </CorretorLayout>
  );
};

export default CorretorTemas;