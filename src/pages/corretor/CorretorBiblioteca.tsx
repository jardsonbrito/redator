import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Library } from "lucide-react";
import { StudentBibliotecaCard } from "@/components/shared/StudentBibliotecaCard";
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
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Biblioteca</h1>
            <p className="text-gray-600">Materiais disponíveis para consulta</p>
          </div>
          <div className="text-center">Carregando materiais...</div>
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

  const handleViewPdf = async (materialId: string, arquivoUrl: string, titulo: string, categoria: string) => {
    // Corretor tem acesso a tudo, apenas abrir o arquivo
    window.open(arquivoUrl, '_blank');
  };

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
          <div className="space-y-8">
            {Object.entries(materiaisPorCategoria).map(([categoria, materiaisGrupo]) => (
              <div key={categoria} className="space-y-4">
                <div className="flex items-center gap-3">
                  <h3 className="text-2xl font-bold text-redator-primary">
                    {categoria}
                  </h3>
                  <Badge variant="outline" className="text-sm">
                    {materiaisGrupo.length} material(is)
                  </Badge>
                </div>
                
                <div className="grid gap-6 lg:grid-cols-1 xl:grid-cols-2">
                  {materiaisGrupo.map((material) => {
                    const isLivroDigital = categoria.toLowerCase().includes('livro digital');
                    
                    // Corretor sempre tem acesso
                    const podeAcessar = true;
                    
                    return (
                      <StudentBibliotecaCard
                        key={material.id}
                        title={material.titulo}
                        description={material.descricao}
                        coverUrl={material.thumbnail_url}
                        coverAlt={`Capa do material ${material.titulo}`}
                        categoria={material.categorias?.nome || 'Sem categoria'}
                        publishedAt={material.published_at}
                        unpublishedAt={material.unpublished_at}
                        isLivroDigital={isLivroDigital}
                        podeAcessar={podeAcessar}
                        onViewPdf={() => handleViewPdf(
                          material.id,
                          material.arquivo_url, 
                          material.titulo,
                          categoria
                        )}
                      />
                    );
                  })}
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