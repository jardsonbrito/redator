import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ClipboardCheck } from "lucide-react";
import { CorretorLayout } from "@/components/corretor/CorretorLayout";
import { SimuladoCardPadrao } from "@/components/shared/SimuladoCardPadrao";
import { useNavigate } from "react-router-dom";
import { useCorretorAuth } from "@/hooks/useCorretorAuth";
import { useToast } from "@/hooks/use-toast";

const CorretorSimulados = () => {
  const navigate = useNavigate();
  const { corretor } = useCorretorAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const turmasCorretor: string[] = corretor?.turmas_autorizadas ?? [];

  const { data: simulados, isLoading, error } = useQuery({
    queryKey: ['simulados-corretor', turmasCorretor],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('simulados')
        .select(`
          *,
          tema:temas(id, frase_tematica, eixo_tematico, cover_file_path, cover_url)
        `)
        .eq('ativo', true)
        .order('data_inicio', { ascending: false });

      if (error) throw error;
      const todos = data || [];

      // Filtra somente simulados vinculados às turmas do corretor
      if (turmasCorretor.length === 0) return todos;
      return todos.filter(s => {
        const turmasSimulado = s.turmas_autorizadas as string[] | null;
        if (!turmasSimulado || turmasSimulado.length === 0) return true;
        return turmasSimulado.some(t => turmasCorretor.includes(t));
      });
    },
    enabled: !!corretor,
  });

  const handleExcluir = async (id: string) => {
    if (!corretor) return;
    try {
      const { data, error } = await supabase.rpc('deletar_simulado_corretor' as any, {
        p_corretor_email: corretor.email,
        p_simulado_id: id,
      });
      if (error) throw error;
      const result = data as { success: boolean; message?: string };
      if (!result?.success) {
        toast({ title: "Não foi possível excluir", description: result?.message, variant: "destructive" });
        return;
      }
      toast({ title: "Simulado excluído com sucesso!" });
      queryClient.invalidateQueries({ queryKey: ['simulados-corretor'] });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro ao excluir simulado.";
      toast({ title: "Erro", description: msg, variant: "destructive" });
    }
  };

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
              className="bg-white text-violet-700 hover:bg-violet-50 hover:text-violet-700 font-semibold shrink-0"
              onClick={() => navigate("/corretor/simulados/novo")}
            >
              Cadastrar Simulado
            </Button>
          </div>
        </div>

        {(!simulados || simulados.length === 0) ? (
          <Card>
            <CardContent className="text-center py-12">
              <ClipboardCheck className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-600 mb-2">
                Nenhum simulado encontrado
              </h3>
              <p className="text-gray-500">
                Os simulados vinculados às suas turmas aparecerão aqui.
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
                  onVerDetalhes: (id) => navigate(`/corretor/simulados/${id}/redacoes`),
                  onEditar: (id) => navigate(`/corretor/simulados/${id}/editar`),
                  onExcluir: handleExcluir,
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