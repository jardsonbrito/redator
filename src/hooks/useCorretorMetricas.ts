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

export const useCorretorMetricas = (corretorEmail: string, turmasAutorizadas: string[] = []) => {
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
  }, [corretorEmail, turmasAutorizadas.join(',')]);

  const fetchMetricas = async () => {
    try {
      setLoading(true);

      // Buscar dados das redações do corretor (lista de envios)
      const { data: redacoes, error } = await supabase
        .rpc('get_redacoes_corretor_detalhadas', {
          corretor_email: corretorEmail
        });

      if (error) throw error;

      const totalEnvios = redacoes?.length || 0;
      const pendencias = redacoes?.filter(r => r.status_minha_correcao === 'pendente') || [];

      // Evolução de envios por mês — calculado dos dados reais
      const enviosPorMes = new Map<string, number>();
      (redacoes || []).forEach(r => {
        if (!r.data_envio) return;
        const d = new Date(r.data_envio);
        const mes = `${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getFullYear()).slice(2)}`;
        enviosPorMes.set(mes, (enviosPorMes.get(mes) || 0) + 1);
      });
      const evolucaoEnviosPorMes = Array.from(enviosPorMes.entries())
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([mes, envios]) => ({ mes, envios }));

      // Evolução de notas por mês — busca notas reais das redações corrigidas das turmas do corretor
      let evolucaoNotasPorMes: { mes: string; nota: number }[] = [];
      let mediaNota = 0;

      if (turmasAutorizadas.length > 0) {
        const [enviadasRes, simuladoRes] = await Promise.all([
          supabase
            .from('redacoes_enviadas')
            .select('nota_total, data_envio')
            .in('turma', turmasAutorizadas)
            .eq('corrigida', true)
            .is('deleted_at', null)
            .not('nota_total', 'is', null),
          supabase
            .from('redacoes_simulado')
            .select('nota_total, data_envio')
            .in('turma', turmasAutorizadas)
            .eq('corrigida', true)
            .is('deleted_at', null)
            .not('nota_total', 'is', null),
        ]);

        const todasCorrigidas = [
          ...(enviadasRes.data || []),
          ...(simuladoRes.data || []),
        ];

        if (todasCorrigidas.length > 0) {
          const somaTotal = todasCorrigidas.reduce((sum, r) => sum + Number(r.nota_total), 0);
          mediaNota = Math.round(somaTotal / todasCorrigidas.length);

          const notasPorMes = new Map<string, { soma: number; count: number }>();
          todasCorrigidas.forEach(r => {
            if (!r.data_envio) return;
            const d = new Date(r.data_envio);
            const mes = `${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getFullYear()).slice(2)}`;
            const atual = notasPorMes.get(mes) || { soma: 0, count: 0 };
            notasPorMes.set(mes, { soma: atual.soma + Number(r.nota_total), count: atual.count + 1 });
          });
          evolucaoNotasPorMes = Array.from(notasPorMes.entries())
            .sort((a, b) => a[0].localeCompare(b[0]))
            .map(([mes, { soma, count }]) => ({ mes, nota: Math.round(soma / count) }));
        }
      }

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