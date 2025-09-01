import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { UnifiedCard, UnifiedCardSkeleton } from "@/components/ui/unified-card";
import { ClipboardCheck, Calendar, Clock } from "lucide-react";
import { CorretorLayout } from "@/components/corretor/CorretorLayout";
import { resolveSimuladoCover, formatarData, formatarHorario } from "@/utils/coverUtils";

const CorretorSimulados = () => {
  const { data: simulados, isLoading, error } = useQuery({
    queryKey: ['simulados-corretor'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('simulados')
        .select(`
          *,
          tema:temas(id, frase_tematica, eixo_tematico, cover_file_path, cover_url)
        `)
        .eq('ativo', true)
        .lt('data_fim', new Date().toISOString().split('T')[0]) // Apenas simulados já finalizados
        .order('data_fim', { ascending: false });
      
      if (error) throw error;
      return data || [];
    }
  });

  if (isLoading) {
    return (
      <CorretorLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Simulados</h1>
            <p className="text-gray-600">Simulados finalizados disponíveis para consulta</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
          <p className="text-red-600">Erro ao carregar simulados. Tente novamente.</p>
        </div>
      </CorretorLayout>
    );
  }

  return (
    <CorretorLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Simulados</h1>
          <p className="text-gray-600">Simulados finalizados disponíveis para consulta</p>
        </div>

        {(!simulados || simulados.length === 0) ? (
          <Card>
            <CardContent className="text-center py-12">
              <ClipboardCheck className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-600 mb-2">
                Nenhum simulado finalizado
              </h3>
              <p className="text-gray-500">
                Os simulados já realizados aparecerão aqui.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {simulados?.map((simulado) => {
              const coverUrl = resolveSimuladoCover(simulado);
              const dataInicio = new Date(`${simulado.data_inicio}T${simulado.hora_inicio}`);
              const dataFim = new Date(`${simulado.data_fim}T${simulado.hora_fim}`);
              
              const badges: Array<{ label: string; tone: 'primary' | 'neutral' | 'success' | 'warning' }> = [];
              badges.push({ label: 'Finalizado', tone: 'neutral' });
              
              if (simulado.tema?.eixo_tematico) {
                badges.push({ label: simulado.tema.eixo_tematico, tone: 'primary' });
              }

              const meta = [
                { icon: Calendar, text: formatarData(dataInicio, dataFim) },
                { icon: Clock, text: formatarHorario(dataInicio, dataFim) }
              ];

              return (
                <UnifiedCard
                  key={simulado.id}
                  variant="corretor"
                  item={{
                    coverUrl,
                    title: simulado.titulo,
                    subtitle: simulado.tema?.frase_tematica || simulado.frase_tematica,
                    badges,
                    meta,
                    cta: {
                      label: 'Ver detalhes',
                      onClick: () => {
                        // Navegar para detalhes do simulado
                        window.open(`/simulados/${simulado.id}`, '_blank');
                      },
                      ariaLabel: `Ver detalhes do simulado ${simulado.titulo}`
                    },
                    ariaLabel: `Simulado: ${simulado.titulo}`
                  }}
                />
              );
            })}
          </div>
        )}
      </div>
    </CorretorLayout>
  );
};

export default CorretorSimulados;