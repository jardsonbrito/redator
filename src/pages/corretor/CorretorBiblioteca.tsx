import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileText, Download, Library } from "lucide-react";
import { CorretorLayout } from "@/components/corretor/CorretorLayout";

const CorretorBiblioteca = () => {
  const { data: materiais, isLoading, error } = useQuery({
    queryKey: ['biblioteca-corretor'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('biblioteca_materiais')
        .select(`
          *,
          categorias (
            id,
            nome,
            slug
          )
        `)
        .eq('status', 'publicado')
        .order('data_publicacao', { ascending: false });
      
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
          <p className="text-red-600">Erro ao carregar materiais. Tente novamente.</p>
        </div>
      </CorretorLayout>
    );
  }

  // Agrupar materiais por categoria
  const materiaisPorCategoria = materiais?.reduce((acc, material) => {
    const categoria = material.categorias?.nome || 'Outros';
    if (!acc[categoria]) {
      acc[categoria] = [];
    }
    acc[categoria].push(material);
    return acc;
  }, {} as Record<string, any[]>) || {};

  return (
    <CorretorLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Biblioteca</h1>
          <p className="text-gray-600">Materiais disponíveis para consulta</p>
        </div>

        {Object.keys(materiaisPorCategoria).length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <Library className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-600 mb-2">
                Nenhum material disponível
              </h3>
              <p className="text-gray-500">
                Os materiais aparecerão aqui quando forem publicados.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {Object.entries(materiaisPorCategoria).map(([categoria, materiaisGrupo]) => (
              <div key={categoria}>
                <h2 className="text-xl font-semibold text-gray-900 mb-4">
                  {categoria}
                </h2>
                
                <div className="grid gap-4">
                  {materiaisGrupo.map((material) => (
                    <Card key={material.id} className="hover:shadow-md transition-shadow">
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <CardTitle className="text-lg mb-2 flex items-center gap-2">
                              <FileText className="w-5 h-5 text-gray-600" />
                              {material.titulo}
                            </CardTitle>
                            
                            {material.descricao && (
                              <p className="text-gray-600 mb-3">{material.descricao}</p>
                            )}
                            
                            <div className="flex items-center gap-2">
                              <Badge variant="outline">{material.categorias?.nome}</Badge>
                              <span className="text-sm text-gray-500">
                                {material.arquivo_nome}
                              </span>
                            </div>
                          </div>
                          
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => window.open(material.arquivo_url, '_blank')}
                          >
                            <Download className="w-4 h-4 mr-2" />
                            Baixar PDF
                          </Button>
                        </div>
                      </CardHeader>
                    </Card>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </CorretorLayout>
  );
};

export default CorretorBiblioteca;