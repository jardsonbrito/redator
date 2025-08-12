import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { UnifiedCard, UnifiedCardSkeleton } from "@/components/ui/unified-card";
import { GraduationCap, Play, FileText } from "lucide-react";
import { CorretorLayout } from "@/components/corretor/CorretorLayout";
import { resolveAulaCover } from "@/utils/coverUtils";

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
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Aulas</h1>
            <p className="text-gray-600">Aulas disponíveis para consulta</p>
          </div>
          <div className="space-y-4">
            <UnifiedCardSkeleton />
            <UnifiedCardSkeleton />
            <UnifiedCardSkeleton />
          </div>
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
                
                <div className="space-y-4">
                  {aulasGrupo.map((aula) => {
                    const coverUrl = resolveAulaCover(aula);
                    const badges = [{ label: aula.modulo, tone: 'primary' as const }];
                    
                    return (
                      <UnifiedCard
                        key={aula.id}
                        variant="corretor"
                        item={{
                          coverUrl,
                          title: aula.titulo,
                          subtitle: aula.descricao,
                          badges,
                          cta: {
                            label: 'Assistir',
                            onClick: () => window.open(aula.link_conteudo, '_blank'),
                            ariaLabel: `Assistir ${aula.titulo}`
                          },
                          ariaLabel: `Aula: ${aula.titulo}`
                        }}
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

export default CorretorAulas;