import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { GraduationCap, Play, FileText } from "lucide-react";
import { CorretorLayout } from "@/components/corretor/CorretorLayout";

const CorretorAulas = () => {
  const { data: aulas, isLoading, error } = useQuery({
    queryKey: ['aulas-corretor'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('aulas')
        .select('*')
        .eq('ativo', true)
        .order('criado_em', { ascending: false });
      
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
          <p className="text-red-600">Erro ao carregar aulas. Tente novamente.</p>
        </div>
      </CorretorLayout>
    );
  }

  // Agrupar aulas por módulo
  const aulasPorModulo = aulas?.reduce((acc, aula) => {
    const modulo = aula.modulo || 'Outros';
    if (!acc[modulo]) {
      acc[modulo] = [];
    }
    acc[modulo].push(aula);
    return acc;
  }, {} as Record<string, any[]>) || {};

  return (
    <CorretorLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Aulas</h1>
          <p className="text-gray-600">Aulas disponíveis para consulta</p>
        </div>

        {Object.keys(aulasPorModulo).length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <GraduationCap className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-600 mb-2">
                Nenhuma aula disponível
              </h3>
              <p className="text-gray-500">
                As aulas aparecerão aqui quando forem publicadas.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {Object.entries(aulasPorModulo).map(([modulo, aulasGrupo]) => (
              <div key={modulo}>
                <h2 className="text-xl font-semibold text-gray-900 mb-4">
                  {modulo}
                </h2>
                
                <div className="grid gap-4">
                  {aulasGrupo.map((aula) => (
                    <Card key={aula.id} className="hover:shadow-md transition-shadow">
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <CardTitle className="text-lg mb-2 flex items-center gap-2">
                              <GraduationCap className="w-5 h-5 text-gray-600" />
                              {aula.titulo}
                            </CardTitle>
                            
                            {aula.descricao && (
                              <p className="text-gray-600 mb-3">{aula.descricao}</p>
                            )}
                            
                            <div className="flex items-center gap-2">
                              <Badge variant="outline">{aula.modulo}</Badge>
                            </div>
                          </div>
                          
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => window.open(aula.link_conteudo, '_blank')}
                            >
                              <Play className="w-4 h-4 mr-2" />
                              Assistir
                            </Button>
                            
                            {aula.pdf_url && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => window.open(aula.pdf_url, '_blank')}
                              >
                                <FileText className="w-4 h-4 mr-2" />
                                PDF
                              </Button>
                            )}
                          </div>
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

export default CorretorAulas;