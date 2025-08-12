
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Trash2, Users, Calendar, Clock, Edit } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format, isAfter, isBefore } from "date-fns";
import { ptBR } from "date-fns/locale";
import { SimuladoForm } from "./SimuladoForm";
import { AdminCard, AdminCardSkeleton, type BadgeTone } from "@/components/admin/AdminCard";
import { resolveCover } from "@/utils/coverUtils";
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

  const getStatusSimulado = (simulado: any) => {
    const now = new Date();
    const inicio = new Date(`${simulado.data_inicio}T${simulado.hora_inicio}`);
    const fim = new Date(`${simulado.data_fim}T${simulado.hora_fim}`);
    
    if (isBefore(now, inicio)) {
      return { status: "Agendado", color: "bg-blue-500" };
    } else if (isAfter(now, inicio) && isBefore(now, fim)) {
      return { status: "Ativo", color: "bg-green-500" };
    } else {
      return { status: "Encerrado", color: "bg-gray-500" };
    }
  };

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

  if (isLoading) {
    return (
      <div className="space-y-4">
        <AdminCardSkeleton />
        <AdminCardSkeleton />
        <AdminCardSkeleton />
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
        <div className="grid gap-4 md:gap-5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {simulados.map((simulado) => {
            const statusInfo = getStatusSimulado(simulado);
            const tema = simulado.tema as any | null;
            const coverUrl = tema ? resolveCover(tema.cover_file_path, tema.cover_url) : resolveCover(undefined, undefined);
            const subtitle = (tema?.frase_tematica as string) || simulado.frase_tematica;
            const tone: BadgeTone = statusInfo.status === 'Ativo' ? 'success' : 'neutral';
            const badges: { label: string; tone?: BadgeTone }[] = [];
            if (tema?.eixo_tematico) badges.push({ label: tema.eixo_tematico as string, tone: 'primary' });
            badges.push({ label: statusInfo.status, tone });
            if (Array.isArray(simulado.turmas_autorizadas) && simulado.turmas_autorizadas.length > 0) {
              simulado.turmas_autorizadas.forEach((t: string) => badges.push({ label: t === 'visitante' ? 'Visitantes' : t, tone: 'neutral' }));
            }

            return (
              <AdminCard
                key={simulado.id}
                item={{
                  id: simulado.id,
                  module: 'simulados',
                  coverUrl,
                  title: simulado.titulo,
                  subtitle,
                  badges,
                  meta: [
                    { icon: Calendar, text: `Início: ${format(new Date(`${simulado.data_inicio}T${simulado.hora_inicio}`), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}` },
                    { icon: Clock, text: `Fim: ${format(new Date(`${simulado.data_fim}T${simulado.hora_fim}`), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}` },
                  ],
                  actions: [
                    { icon: Edit, label: 'Editar', onClick: () => handleEdit(simulado) },
                    { icon: Trash2, label: 'Excluir', onClick: () => deletarSimulado.mutate(simulado.id), tone: 'danger' },
                  ],
                }}
              />
            );
          })}
        </div>
      )}
    </div>
  );
};

export default SimuladoList;
