
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { FileText, Clock, CheckCircle, Users, GraduationCap, TrendingUp, Trophy, AlertTriangle } from "lucide-react";
import { useNavigate } from "react-router-dom";


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
  const navigate = useNavigate();
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

  const handleCardClick = (type: string) => {
    switch (type) {
      case 'redacoes':
        navigate('/admin/redacoes');
        break;
      case 'pendentes':
        navigate('/admin/redacoes?status=pendentes');
        break;
      case 'corrigidas':
        navigate('/admin/redacoes?status=corrigidas');
        break;
      case 'turmas':
        navigate('/admin/alunos');
        break;
      case 'corretores':
        navigate('/admin/corretores');
        break;
    }
  };

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

  return (
    <div className="space-y-6">
      {/* Mini cards superiores */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="hover:shadow-md transition-all duration-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <TrendingUp className="w-8 h-8 text-blue-600" />
              <div>
                <p className="text-2xl font-bold text-blue-600">{metrics.mediaGeral}</p>
                <p className="text-sm text-gray-600">Média Geral</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-all duration-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Trophy className="w-8 h-8 text-green-600" />
              <div>
                <p className="text-lg font-bold text-green-600">{metrics.maiorNota.nota}</p>
                <p className="text-xs text-gray-600">Maior Nota - {metrics.maiorNota.aluno}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-all duration-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-8 h-8 text-orange-600" />
              <div>
                <p className="text-lg font-bold text-orange-600">{metrics.menorNota.nota}</p>
                <p className="text-xs text-gray-600">Menor Nota - {metrics.menorNota.aluno}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Cards principais clicáveis */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card 
          className="cursor-pointer hover:shadow-lg transition-all duration-200 hover:scale-105"
          onClick={() => handleCardClick('redacoes')}
        >
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-3 text-blue-700">
              <FileText className="w-6 h-6" />
              Redações Enviadas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600 mb-2">
              {metrics.totalRedacoes}
            </div>
            <p className="text-sm text-gray-600">Ver todas as redações enviadas</p>
          </CardContent>
        </Card>

        <Card 
          className="cursor-pointer hover:shadow-lg transition-all duration-200 hover:scale-105"
          onClick={() => handleCardClick('pendentes')}
        >
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-3 text-yellow-700">
              <Clock className="w-6 h-6" />
              Pendentes de Correção
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-yellow-600 mb-2">
              {metrics.redacoesPendentes}
            </div>
            <p className="text-sm text-gray-600">Redações aguardando correção</p>
          </CardContent>
        </Card>

        <Card 
          className="cursor-pointer hover:shadow-lg transition-all duration-200 hover:scale-105"
          onClick={() => handleCardClick('corrigidas')}
        >
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-3 text-green-700">
              <CheckCircle className="w-6 h-6" />
              Redações Corrigidas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600 mb-2">
              {metrics.redacoesCorrigidas}
            </div>
            <p className="text-sm text-gray-600">Redações já corrigidas</p>
          </CardContent>
        </Card>

        <Card 
          className="cursor-pointer hover:shadow-lg transition-all duration-200 hover:scale-105"
          onClick={() => handleCardClick('turmas')}
        >
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-3 text-purple-700">
              <GraduationCap className="w-6 h-6" />
              Turmas Cadastradas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-purple-600 mb-2">
              {metrics.turmasCadastradas}
            </div>
            <p className="text-sm text-gray-600">Ver alunos por turma</p>
          </CardContent>
        </Card>

        <Card 
          className="cursor-pointer hover:shadow-lg transition-all duration-200 hover:scale-105"
          onClick={() => handleCardClick('corretores')}
        >
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-3 text-indigo-700">
              <Users className="w-6 h-6" />
              Corretores Ativos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-indigo-600 mb-2">
              {metrics.corretoresAtivos}
            </div>
            <p className="text-sm text-gray-600">Gerenciar corretores</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
