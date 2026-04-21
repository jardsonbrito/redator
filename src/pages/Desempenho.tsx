import { StudentHeader } from "@/components/StudentHeader";
import { BottomNavigation } from "@/components/BottomNavigation";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { useStudentAuth } from "@/hooks/useStudentAuth";
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText, Star, TrendingDown, TrendingUp } from 'lucide-react';
import { RadialBarChart, RadialBar, ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, Area, AreaChart, CartesianGrid } from 'recharts';
import { useState } from "react";

interface RedacaoHistorico {
  id: string;
  data_envio: string;
  nota_total: number | null;
}

interface DesempenhoData {
  totalEnviadas: number;
  maiorNota: number | null;
  menorNota: number | null;
  notaMedia: number | null;
  historico: RedacaoHistorico[];
}

const Desempenho = () => {
  const { studentData } = useStudentAuth();
  const [periodoSelecionado, setPeriodoSelecionado] = useState<string>("6");

  const userType = localStorage.getItem('userType');
  const isVisitante = userType === 'visitante';

  const { data: desempenho, isLoading } = useQuery({
    queryKey: ['student-performance-detailed', studentData.email, userType],
    queryFn: async (): Promise<DesempenhoData> => {
      const emailBusca = studentData.email?.toLowerCase().trim();

      if (!emailBusca) {
        return { totalEnviadas: 0, maiorNota: null, menorNota: null, notaMedia: null, historico: [] };
      }

      // Buscar redações com histórico
      const queryBase = isVisitante
        ? supabase
            .from('redacoes_enviadas')
            .select('id, data_envio, nota_total')
            .eq('turma', 'visitante')
            .ilike('email_aluno', emailBusca)
        : supabase
            .from('redacoes_enviadas')
            .select('id, data_envio, nota_total')
            .ilike('email_aluno', emailBusca);

      const { data: redacoesRegulares } = await queryBase
        .is('deleted_at', null)
        .not('nota_total', 'is', null)
        .order('data_envio', { ascending: true });

      const { data: redacoesSimulado } = await supabase
        .from('redacoes_simulado')
        .select('id, data_envio, nota_total')
        .ilike('email_aluno', emailBusca)
        .is('deleted_at', null)
        .not('nota_total', 'is', null)
        .order('data_envio', { ascending: true });

      // Combinar e ordenar por data
      const todasRedacoes = [...(redacoesRegulares || []), ...(redacoesSimulado || [])]
        .sort((a, b) => new Date(a.data_envio).getTime() - new Date(b.data_envio).getTime());

      const todasNotas = todasRedacoes.map(r => r.nota_total).filter(nota => nota !== null) as number[];

      const notaMedia = todasNotas.length > 0
        ? Math.round(todasNotas.reduce((acc, nota) => acc + nota, 0) / todasNotas.length)
        : null;

      return {
        totalEnviadas: todasRedacoes.length,
        maiorNota: todasNotas.length > 0 ? Math.max(...todasNotas) : null,
        menorNota: todasNotas.length > 0 ? Math.min(...todasNotas) : null,
        notaMedia,
        historico: todasRedacoes.map(r => ({
          id: r.id,
          data_envio: r.data_envio,
          nota_total: r.nota_total
        }))
      };
    },
    enabled: !!studentData.email,
    refetchOnWindowFocus: true,
    staleTime: 30000,
  });

  const dados = desempenho || { totalEnviadas: 0, maiorNota: null, menorNota: null, notaMedia: null, historico: [] };

  // Preparar dados para o gráfico radial
  const notaAtual = dados.notaMedia || 0;
  const metaPontos = 900;
  const percentualMeta = (notaAtual / metaPontos) * 100;

  const dadosRadial = [
    {
      name: 'Desempenho',
      pontos: notaAtual,
      fill: '#8b5cf6',
    },
  ];

  // Preparar dados para o gráfico de evolução
  const limitePeriodo = parseInt(periodoSelecionado);
  const historicoFiltrado = dados.historico.slice(-limitePeriodo);

  const dadosEvolucao = historicoFiltrado.map((red, index) => ({
    envio: `#${index + 1}`,
    nota: red.nota_total || 0,
    data: new Date(red.data_envio).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
  }));

  // Calcular progresso recente
  const ultimasCinco = dados.historico.slice(-5);
  const primeirasCinco = dados.historico.slice(-10, -5);

  let progressoRecente = 0;
  if (ultimasCinco.length > 0 && primeirasCinco.length > 0) {
    const mediaRecente = ultimasCinco.reduce((acc, r) => acc + (r.nota_total || 0), 0) / ultimasCinco.length;
    const mediaAnterior = primeirasCinco.reduce((acc, r) => acc + (r.nota_total || 0), 0) / primeirasCinco.length;
    progressoRecente = Math.round(mediaRecente - mediaAnterior);
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gradient-to-br from-secondary/20 via-secondary/10 to-secondary/5 pb-20">
        <StudentHeader />

        <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Título da seção */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-800">Meu desempenho</h1>
            <p className="text-gray-600 mt-2">Acompanhe sua evolução nas redações</p>
          </div>

          {isLoading ? (
            <div className="space-y-6">
              <Skeleton className="h-64 w-full rounded-3xl" />
              <Skeleton className="h-24 w-full rounded-3xl" />
              <Skeleton className="h-80 w-full rounded-3xl" />
            </div>
          ) : (
            <div className="space-y-6">
              {/* Card principal de desempenho */}
              <Card className="rounded-3xl border-none shadow-lg bg-white overflow-hidden">
                <CardContent className="p-8">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
                    {/* Lado esquerdo: Gráfico circular */}
                    <div className="flex flex-col items-center justify-center">
                      <div className="relative w-64 h-64">
                        <ResponsiveContainer width="100%" height="100%">
                          <RadialBarChart
                            cx="50%"
                            cy="50%"
                            innerRadius="70%"
                            outerRadius="100%"
                            barSize={24}
                            data={dadosRadial}
                            startAngle={90}
                            endAngle={-270}
                          >
                            <RadialBar
                              background={{ fill: '#f3e8ff' }}
                              dataKey="pontos"
                              cornerRadius={10}
                              fill="#8b5cf6"
                              max={metaPontos}
                            />
                          </RadialBarChart>
                        </ResponsiveContainer>

                        {/* Texto central */}
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                          <p className="text-5xl font-bold text-primary">{notaAtual}</p>
                          <p className="text-sm text-gray-500 mt-1">pontos</p>
                          <p className="text-xs text-gray-400">de {metaPontos}</p>
                        </div>
                      </div>
                    </div>

                    {/* Lado direito: Contexto */}
                    <div className="space-y-6">
                      <div>
                        <h3 className="text-2xl font-bold text-gray-800 mb-2">Nota média atual</h3>
                        {notaAtual > 0 ? (
                          <>
                            <p className="text-gray-600 text-lg">
                              Você está a <span className="font-semibold text-primary">{metaPontos - notaAtual} pontos</span> da sua meta!
                            </p>
                            <div className="mt-4">
                              <Badge variant="secondary" className="px-4 py-2 text-base">
                                Meta: {metaPontos} pontos
                              </Badge>
                            </div>
                          </>
                        ) : (
                          <p className="text-gray-500">
                            Envie redações para começar a acompanhar seu desempenho
                          </p>
                        )}
                      </div>

                      {/* Barra de progresso visual */}
                      {notaAtual > 0 && (
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm text-gray-600">
                            <span>Progresso</span>
                            <span className="font-semibold">{Math.round(percentualMeta)}%</span>
                          </div>
                          <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-violet-500 to-purple-600 rounded-full transition-all duration-500"
                              style={{ width: `${Math.min(percentualMeta, 100)}%` }}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Card de status */}
              {dados.totalEnviadas >= 5 && (
                <Card className="rounded-3xl border-none shadow-md bg-gradient-to-r from-violet-50 to-purple-50">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <TrendingUp className="w-6 h-6 text-primary" />
                      </div>
                      <div>
                        <p className="font-semibold text-gray-800 text-lg">
                          {progressoRecente > 0
                            ? 'Você está em evolução constante!'
                            : progressoRecente < 0
                            ? 'Continue praticando para evoluir!'
                            : 'Mantenha o ritmo de estudos!'}
                        </p>
                        <p className="text-gray-600 text-sm mt-1">
                          {progressoRecente !== 0 && Math.abs(progressoRecente) > 5
                            ? `${progressoRecente > 0 ? '+' : ''}${progressoRecente} pontos nas últimas ${ultimasCinco.length} redações`
                            : 'Seu histórico de evolução está sendo construído'}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {dados.totalEnviadas < 5 && dados.totalEnviadas > 0 && (
                <Card className="rounded-3xl border-none shadow-md bg-gradient-to-r from-blue-50 to-indigo-50">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                        <FileText className="w-6 h-6 text-blue-600" />
                      </div>
                      <div>
                        <p className="font-semibold text-gray-800 text-lg">Seu histórico está crescendo!</p>
                        <p className="text-gray-600 text-sm mt-1">
                          Envie mais redações para acompanhar sua evolução detalhada
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Gráfico de evolução */}
              <Card className="rounded-3xl border-none shadow-lg bg-white">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-2xl">Evolução das notas</CardTitle>
                      <CardDescription className="mt-1">Acompanhe seu progresso ao longo do tempo</CardDescription>
                    </div>
                    <Select value={periodoSelecionado} onValueChange={setPeriodoSelecionado}>
                      <SelectTrigger className="w-[180px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="6">Últimos 6 envios</SelectItem>
                        <SelectItem value="10">Últimos 10 envios</SelectItem>
                        <SelectItem value="15">Últimos 15 envios</SelectItem>
                        <SelectItem value="20">Últimos 20 envios</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardHeader>
                <CardContent>
                  {dadosEvolucao.length > 0 ? (
                    <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={dadosEvolucao} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                          <defs>
                            <linearGradient id="colorNota" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/>
                              <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                          <XAxis
                            dataKey="envio"
                            stroke="#9ca3af"
                            style={{ fontSize: '12px' }}
                          />
                          <YAxis
                            domain={[0, 1000]}
                            stroke="#9ca3af"
                            style={{ fontSize: '12px' }}
                          />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: 'white',
                              border: '1px solid #e5e7eb',
                              borderRadius: '12px',
                              padding: '12px'
                            }}
                            labelStyle={{ fontWeight: 'bold', color: '#374151' }}
                          />
                          <Area
                            type="monotone"
                            dataKey="nota"
                            stroke="#8b5cf6"
                            strokeWidth={3}
                            fill="url(#colorNota)"
                            dot={{ fill: '#8b5cf6', r: 6 }}
                            activeDot={{ r: 8 }}
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div className="h-80 flex flex-col items-center justify-center text-center">
                      <FileText className="w-16 h-16 text-gray-300 mb-4" />
                      <p className="text-gray-500 text-lg font-medium">Ainda não há dados suficientes</p>
                      <p className="text-gray-400 text-sm mt-2">Envie redações para visualizar sua evolução</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Cards de resumo */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Enviadas */}
                <Card className="rounded-3xl border-none shadow-md bg-gradient-to-br from-violet-50 to-purple-50 overflow-hidden">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="w-14 h-14 rounded-2xl bg-primary flex items-center justify-center">
                        <FileText className="w-7 h-7 text-white" />
                      </div>
                    </div>
                    <h3 className="text-sm font-medium text-gray-600 mb-1">Enviadas</h3>
                    <p className="text-4xl font-bold text-primary mb-1">{dados.totalEnviadas}</p>
                    <p className="text-xs text-gray-500">Total de redações</p>
                  </CardContent>
                </Card>

                {/* Melhor nota */}
                <Card className="rounded-3xl border-none shadow-md bg-gradient-to-br from-emerald-50 to-teal-50 overflow-hidden">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="w-14 h-14 rounded-2xl bg-emerald-500 flex items-center justify-center">
                        <Star className="w-7 h-7 text-white" />
                      </div>
                    </div>
                    <h3 className="text-sm font-medium text-gray-600 mb-1">Melhor nota</h3>
                    <p className="text-4xl font-bold text-emerald-600 mb-1">
                      {dados.maiorNota !== null ? dados.maiorNota : '–'}
                    </p>
                    <p className="text-xs text-gray-500">Maior pontuação</p>
                  </CardContent>
                </Card>

                {/* Menor nota */}
                <Card className="rounded-3xl border-none shadow-md bg-gradient-to-br from-amber-50 to-orange-50 overflow-hidden">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="w-14 h-14 rounded-2xl bg-amber-500 flex items-center justify-center">
                        <TrendingDown className="w-7 h-7 text-white" />
                      </div>
                    </div>
                    <h3 className="text-sm font-medium text-gray-600 mb-1">Menor nota</h3>
                    <p className="text-4xl font-bold text-amber-600 mb-1">
                      {dados.menorNota !== null ? dados.menorNota : '–'}
                    </p>
                    <p className="text-xs text-gray-500">Menor pontuação</p>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </main>

        <BottomNavigation />
      </div>
    </ProtectedRoute>
  );
};

export default Desempenho;
