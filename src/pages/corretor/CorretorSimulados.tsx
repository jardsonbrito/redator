import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ClipboardCheck, Calendar, Clock } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CorretorLayout } from "@/components/corretor/CorretorLayout";

const CorretorSimulados = () => {
  const { data: simulados, isLoading, error } = useQuery({
    queryKey: ['simulados-corretor'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('simulados')
        .select('*')
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
          <p className="text-gray-600">Simulados já realizados (visualização)</p>
        </div>

        <div className="grid gap-4">
          {simulados?.map((simulado) => (
            <Card key={simulado.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg mb-2">{simulado.titulo}</CardTitle>
                    <p className="text-gray-600 mb-3">{simulado.frase_tematica}</p>
                    
                    <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        <span>
                          {format(new Date(simulado.data_inicio), "dd/MM/yyyy", { locale: ptBR })} - {format(new Date(simulado.data_fim), "dd/MM/yyyy", { locale: ptBR })}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        <span>
                          {simulado.hora_inicio} - {simulado.hora_fim}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <Badge variant="secondary">Finalizado</Badge>
                </div>
              </CardHeader>
            </Card>
          ))}

          {(!simulados || simulados.length === 0) && (
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
          )}
        </div>
      </div>
    </CorretorLayout>
  );
};

export default CorretorSimulados;