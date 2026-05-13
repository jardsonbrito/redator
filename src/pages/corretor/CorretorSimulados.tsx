import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ClipboardCheck, Plus } from "lucide-react";
import { CorretorLayout } from "@/components/corretor/CorretorLayout";
import { SimuladoCardPadrao } from "@/components/shared/SimuladoCardPadrao";
import { useNavigate } from "react-router-dom";

const CorretorSimulados = () => {
  const navigate = useNavigate();
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
          <div className="overflow-hidden rounded-2xl bg-gradient-to-r from-violet-900 via-violet-700 to-fuchsia-700 p-6 text-white shadow-lg">
            <p className="text-xs font-semibold uppercase tracking-widest text-violet-200">Avaliações</p>
            <h1 className="text-2xl sm:text-3xl font-black mt-1">Simulados</h1>
            </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="bg-white rounded-xl shadow-md h-80 animate-pulse">
              <div className="w-full h-40 bg-gray-200 rounded-t-xl"></div>
              <div className="p-4 space-y-3">
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                <div className="h-8 bg-gray-200 rounded w-full"></div>
              </div>
            </div>
            <div className="bg-white rounded-xl shadow-md h-80 animate-pulse">
              <div className="w-full h-40 bg-gray-200 rounded-t-xl"></div>
              <div className="p-4 space-y-3">
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                <div className="h-8 bg-gray-200 rounded w-full"></div>
              </div>
            </div>
            <div className="bg-white rounded-xl shadow-md h-80 animate-pulse">
              <div className="w-full h-40 bg-gray-200 rounded-t-xl"></div>
              <div className="p-4 space-y-3">
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                <div className="h-8 bg-gray-200 rounded w-full"></div>
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
        <div className="space-y-6">
          <div className="overflow-hidden rounded-2xl bg-gradient-to-r from-violet-900 via-violet-700 to-fuchsia-700 p-6 text-white shadow-lg">
            <p className="text-xs font-semibold uppercase tracking-widest text-violet-200">Avaliações</p>
            <h1 className="text-2xl sm:text-3xl font-black mt-1">Simulados</h1>
          </div>
          <div className="text-center py-8">
            <p className="text-red-600">Erro ao carregar simulados. Tente novamente.</p>
          </div>
        </div>
      </CorretorLayout>
    );
  }

  return (
    <CorretorLayout>
      <div className="space-y-6">
        {/* Hero */}
        <div className="overflow-hidden rounded-2xl bg-gradient-to-r from-violet-900 via-violet-700 to-fuchsia-700 p-6 text-white shadow-lg">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-violet-200">Avaliações</p>
              <h1 className="text-2xl sm:text-3xl font-black mt-1">Simulados</h1>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="text-white hover:bg-white/10 gap-1.5 shrink-0"
              onClick={() => navigate("/corretor/simulados/novo")}
            >
              <Plus className="w-4 h-4" />
              Novo Simulado
            </Button>
          </div>
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
            {simulados?.map((simulado) => (
              <SimuladoCardPadrao
                key={simulado.id}
                simulado={simulado}
                perfil="corretor"
                actions={{
                  onVerDetalhes: (id) => window.location.href = `/corretor/simulados/${id}/redacoes`
                }}
              />
            ))}
          </div>
        )}
      </div>
    </CorretorLayout>
  );
};

export default CorretorSimulados;