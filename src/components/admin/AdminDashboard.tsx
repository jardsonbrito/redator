
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { FileText, Clock, CheckCircle, AlertTriangle, Trophy, Users, GraduationCap, TrendingUp } from "lucide-react";

interface DashboardMetrics {
  totalRedacoes: number;
  redacoesPendentes: number;
  redacoesCorrigidas: number;
  corretoresAtivos: number;
  turmasCadastradas: number;
  mediaGeral: number;
  maiorNota: { nota: number; aluno: string };
  menorNota: { nota: number; aluno: string };
}

export const AdminDashboard = () => {
  const [metrics, setMetrics] = useState<DashboardMetrics>({
    totalRedacoes: 0,
    redacoesPendentes: 0,
    redacoesCorrigidas: 0,
    corretoresAtivos: 0,
    turmasCadastradas: 0,
    mediaGeral: 0,
    maiorNota: { nota: 0, aluno: "" },
    menorNota: { nota: 0, aluno: "" }
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        // Total de redações enviadas
        const { count: totalRedacoes } = await supabase
          .from('redacoes_enviadas')
          .select('*', { count: 'exact', head: true });

        // Redações pendentes
        const { count: redacoesPendentes } = await supabase
          .from('redacoes_enviadas')
          .select('*', { count: 'exact', head: true })
          .eq('corrigida', false);

        // Redações corrigidas
        const { count: redacoesCorrigidas } = await supabase
          .from('redacoes_enviadas')
          .select('*', { count: 'exact', head: true })
          .eq('corrigida', true);

        // Corretores ativos
        const { count: corretoresAtivos } = await supabase
          .from('corretores')
          .select('*', { count: 'exact', head: true })
          .eq('ativo', true);

        // Turmas cadastradas (contar turmas únicas)
        const { data: turmasData } = await supabase
          .from('profiles')
          .select('turma')
          .not('turma', 'is', null)
          .not('turma', 'eq', '');

        const turmasUnicas = new Set(turmasData?.map(t => t.turma) || []);
        const turmasCadastradas = turmasUnicas.size;

        // Maior e menor nota
        const { data: notasData } = await supabase
          .from('redacoes_enviadas')
          .select('nota_total, nome_aluno')
          .not('nota_total', 'is', null)
          .order('nota_total', { ascending: false });

        let maiorNota = { nota: 0, aluno: "" };
        let menorNota = { nota: 1000, aluno: "" };
        let somaNotas = 0;
        let countNotas = 0;

        if (notasData && notasData.length > 0) {
          maiorNota = { 
            nota: notasData[0].nota_total || 0, 
            aluno: notasData[0].nome_aluno || "N/A" 
          };
          menorNota = { 
            nota: notasData[notasData.length - 1].nota_total || 0, 
            aluno: notasData[notasData.length - 1].nome_aluno || "N/A" 
          };

          // Calcular média
          notasData.forEach(item => {
            if (item.nota_total) {
              somaNotas += item.nota_total;
              countNotas++;
            }
          });
        }

        const mediaGeral = countNotas > 0 ? Math.round(somaNotas / countNotas) : 0;

        setMetrics({
          totalRedacoes: totalRedacoes || 0,
          redacoesPendentes: redacoesPendentes || 0,
          redacoesCorrigidas: redacoesCorrigidas || 0,
          corretoresAtivos: corretoresAtivos || 0,
          turmasCadastradas,
          mediaGeral,
          maiorNota,
          menorNota
        });
      } catch (error) {
        console.error('Erro ao buscar métricas:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchMetrics();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Carregando métricas...</p>
        </div>
      </div>
    );
  }

  const metricsCards = [
    {
      title: "Redações Enviadas",
      value: metrics.totalRedacoes,
      icon: FileText,
      color: "bg-blue-50 text-blue-600"
    },
    {
      title: "Pendentes de Correção",
      value: metrics.redacoesPendentes,
      icon: Clock,
      color: "bg-yellow-50 text-yellow-600"
    },
    {
      title: "Corrigidas",
      value: metrics.redacoesCorrigidas,
      icon: CheckCircle,
      color: "bg-green-50 text-green-600"
    },
    {
      title: "Corretores Ativos",
      value: metrics.corretoresAtivos,
      icon: Users,
      color: "bg-purple-50 text-purple-600"
    },
    {
      title: "Turmas Cadastradas",
      value: metrics.turmasCadastradas,
      icon: GraduationCap,
      color: "bg-indigo-50 text-indigo-600"
    },
    {
      title: "Média Geral",
      value: `${metrics.mediaGeral} pts`,
      icon: TrendingUp,
      color: "bg-gray-50 text-gray-600"
    }
  ];

  return (
    <div className="space-y-6">
      {/* Saudação */}
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-bold text-gray-900">
          Olá, Administrador!
        </h2>
        <p className="text-gray-600">
          Bem-vindo ao Painel do Administrador
        </p>
      </div>

      {/* Métricas principais */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {metricsCards.map((metric, index) => {
          const Icon = metric.icon;
          return (
            <Card key={index} className="hover:shadow-lg transition-all duration-200">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-3 text-sm font-medium">
                  <div className={`p-2 rounded-lg ${metric.color}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  {metric.title}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-900">
                  {metric.value}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Destaques */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="hover:shadow-lg transition-all duration-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-3 text-green-700">
              <Trophy className="w-5 h-5" />
              Maior Nota
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {metrics.maiorNota.nota} pontos
            </div>
            <p className="text-sm text-gray-600">
              {metrics.maiorNota.aluno}
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-all duration-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-3 text-orange-700">
              <AlertTriangle className="w-5 h-5" />
              Menor Nota
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {metrics.menorNota.nota} pontos
            </div>
            <p className="text-sm text-gray-600">
              {metrics.menorNota.aluno}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
