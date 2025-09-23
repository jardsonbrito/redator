
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { SimuladoForm } from "./SimuladoForm";
import { SimuladoCardPadrao } from "@/components/shared/SimuladoCardPadrao";
import { trackAdminEvent } from "@/utils/telemetry";

const SimuladoList = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [simuladoEditando, setSimuladoEditando] = useState<any>(null);
  const [showForm, setShowForm] = useState(false);

  const { data: simulados, isLoading } = useQuery({
    queryKey: ['admin-simulados'],
    queryFn: async () => {
      const { data: sims, error } = await supabase
        .from('simulados')
        .select('*')
        .order('criado_em', { ascending: false });
      if (error) throw error;

      const temaIds = Array.from(new Set((sims || []).map((s) => s.tema_id).filter(Boolean)));
      let temasMap: Record<string, any> = {};
      if (temaIds.length > 0) {
        const { data: temas } = await supabase
          .from('temas')
          .select('id, frase_tematica, eixo_tematico, cover_file_path, cover_url, cover_source')
          .in('id', temaIds as string[]);
        temasMap = (temas || []).reduce((acc: any, t: any) => { acc[t.id] = t; return acc; }, {});
      }

      return (sims || []).map((s) => ({ ...s, tema: s.tema_id ? temasMap[s.tema_id] || null : null }));
    }
  });

  useEffect(() => {
    if (simulados) {
      trackAdminEvent('admin_card_render', { module: 'simulados', count: simulados.length });
    }
  }, [simulados]);

  const handleDeleteSimulado = (id: string) => {
    // Buscar o simulado para mostrar informações na confirmação
    const simulado = simulados?.find(s => s.id === id);
    const nomeSimulado = simulado?.titulo || 'este simulado';

    const confirmDelete = window.confirm(
      `Tem certeza que deseja excluir "${nomeSimulado}"?\n\nEsta ação não pode ser desfeita e todas as redações relacionadas a este simulado serão afetadas.`
    );

    if (confirmDelete) {
      deletarSimulado.mutate(id);
    }
  };

  const deletarSimulado = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('simulados')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Simulado excluído com sucesso!",
        description: "O simulado foi removido do sistema.",
      });
      queryClient.invalidateQueries({ queryKey: ['admin-simulados'] });
    },
    onError: (error) => {
      toast({
        title: "Erro ao excluir simulado",
        description: "Não foi possível excluir o simulado.",
        variant: "destructive",
      });
      console.error("Erro ao excluir simulado:", error);
    }
  });


  const handleEdit = (simulado: any) => {
    setSimuladoEditando(simulado);
    setShowForm(true);
  };

  const handleCancelEdit = () => {
    setSimuladoEditando(null);
    setShowForm(false);
  };

  const handleSuccess = () => {
    setSimuladoEditando(null);
    setShowForm(false);
  };

  const handleToggleStatus = async (id: string, currentStatus: string) => {
    try {
      const newStatus = currentStatus === 'ativo' ? false : true;

      const { error } = await supabase
        .from('simulados')
        .update({ ativo: newStatus })
        .eq('id', id);

      if (error) throw error;

      await queryClient.invalidateQueries({ queryKey: ['admin-simulados'] });

      toast({
        title: "✅ Status alterado",
        description: `Simulado ${newStatus ? 'ativado' : 'desativado'} com sucesso.`,
      });

    } catch (error: any) {
      toast({
        title: "❌ Erro",
        description: error.message || "Erro ao alterar status do simulado.",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
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
    );
  }

  if (showForm) {
    return (
      <div className="space-y-4">
        <SimuladoForm 
          simuladoEditando={simuladoEditando}
          onSuccess={handleSuccess}
          onCancelEdit={handleCancelEdit}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-redator-primary">Simulados Cadastrados</h2>
        <Button onClick={() => setShowForm(true)} variant="default" size="sm">
          Novo Simulado
        </Button>
      </div>
      
      {!simulados || simulados.length === 0 ? (
        <Card>
          <CardContent className="text-center py-8">
            <p className="text-gray-500">Nenhum simulado cadastrado ainda.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {simulados.map((simulado) => (
            <SimuladoCardPadrao
              key={simulado.id}
              simulado={simulado}
              perfil="admin"
              actions={{
                onEditar: (id) => handleEdit(simulado),
                onToggleStatus: (id, currentStatus) => handleToggleStatus(id, currentStatus),
                onExcluir: (id) => handleDeleteSimulado(id)
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default SimuladoList;
