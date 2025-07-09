import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface MetricasCorretor {
  mediaNota: number;
  totalPendencias: number;
  totalEnvios: number;
  evolucaoNotasPorMes: { mes: string; nota: number }[];
  evolucaoEnviosPorMes: { mes: string; envios: number }[];
}

export const useCorretorMetricas = (corretorEmail: string) => {
  const [metricas, setMetricas] = useState<MetricasCorretor>({
    mediaNota: 0,
    totalPendencias: 0,
    totalEnvios: 0,
    evolucaoNotasPorMes: [],
    evolucaoEnviosPorMes: []
  });
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    if (corretorEmail) {
      fetchMetricas();
    }
  }, [corretorEmail]);

  const fetchMetricas = async () => {
    try {
      setLoading(true);

      // Buscar dados das redações do corretor
      const { data: redacoes, error } = await supabase
        .rpc('get_redacoes_corretor_detalhadas', {
          corretor_email: corretorEmail
        });

      if (error) throw error;

      // Calcular métricas
      const totalEnvios = redacoes?.length || 0;
      const redacoesCorrigidas = redacoes?.filter(r => r.status_minha_correcao === 'corrigida') || [];
      const pendencias = redacoes?.filter(r => r.status_minha_correcao === 'pendente') || [];

      // Simular notas médias (na implementação real, você precisaria ter uma tabela com as notas das correções)
      const mediaNota = redacoesCorrigidas.length > 0 ? 713 : 0; // Valor exemplo como mostrado na imagem

      // Criar dados simulados para os gráficos (em implementação real, buscar do banco)
      const evolucaoNotasPorMes = [
        { mes: "02/25", nota: 840 },
        { mes: "03/25", nota: 641 },
        { mes: "04/25", nota: 516 },
        { mes: "05/25", nota: 855 },
        { mes: "06/25", nota: 841 }
      ];

      const evolucaoEnviosPorMes = [
        { mes: "02/25", envios: 75 },
        { mes: "03/25", envios: 115 },
        { mes: "04/25", envios: 115 },
        { mes: "05/25", envios: 77 },
        { mes: "06/25", envios: 63 }
      ];

      setMetricas({
        mediaNota,
        totalPendencias: pendencias.length,
        totalEnvios,
        evolucaoNotasPorMes,
        evolucaoEnviosPorMes
      });

    } catch (error: any) {
      console.error("Erro ao buscar métricas do corretor:", error);
      toast({
        title: "Erro ao carregar métricas",
        description: "Não foi possível carregar as métricas.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return {
    metricas,
    loading,
    fetchMetricas
  };
};