import { Navigate } from "react-router-dom";
import { useCorretorAuth } from "@/hooks/useCorretorAuth";
import { CorretorLayout } from "@/components/corretor/CorretorLayout";
import { useCorretorMetricas } from "@/hooks/useCorretorMetricas";
import { useIsMobile } from "@/hooks/use-mobile";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, Clock, FileText } from "lucide-react";
import { AjudaRapidaCorretorCard } from "@/components/ajuda-rapida/AjudaRapidaCorretorCard";
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Area, AreaChart } from "recharts";

const CorretorDashboard = () => {
  const { corretor, loading } = useCorretorAuth();
  const isMobile = useIsMobile();
  const { metricas, loading: loadingMetricas } = useCorretorMetricas(corretor?.email || '');

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-gray-600">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!corretor) {
    return <Navigate to="/corretor/login" replace />;
  }

  const MetricCard = ({ title, value, icon: Icon, suffix = "" }: {
    title: string;
    value: number;
    icon: any;
    suffix?: string;
  }) => (
    <Card className="bg-white hover:shadow-md transition-shadow">
      <CardContent className="flex items-center justify-between p-4 sm:p-6">
        <div>
          <p className="text-sm text-muted-foreground mb-1">{title}</p>
          <p className="text-2xl sm:text-3xl font-bold text-foreground">
            {value}{suffix}
          </p>
        </div>
        <div className="bg-primary/10 p-2 sm:p-3 rounded-lg">
          <Icon className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
        </div>
      </CardContent>
    </Card>
  );

  const ChartCard = ({ title, data, dataKey, color = "#8b5cf6" }: {
    title: string;
    data: any[];
    dataKey: string;
    color?: string;
  }) => (
    <Card className="bg-white">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-semibold text-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data}>
              <defs>
                <linearGradient id={`gradient-${dataKey}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={color} stopOpacity={0.8}/>
                  <stop offset="95%" stopColor={color} stopOpacity={0.1}/>
                </linearGradient>
              </defs>
              <XAxis 
                dataKey="mes" 
                tick={{ fontSize: 12, fill: '#6b7280' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis 
                tick={{ fontSize: 12, fill: '#6b7280' }}
                axisLine={false}
                tickLine={false}
              />
              <Area
                type="monotone"
                dataKey={dataKey}
                stroke={color}
                strokeWidth={3}
                fill={`url(#gradient-${dataKey})`}
                dot={{ fill: color, strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6, fill: color }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );

  if (loadingMetricas) {
    return (
      <CorretorLayout>
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </CorretorLayout>
    );
  }

  return (
    <CorretorLayout>
      <div className="space-y-4 sm:space-y-6">
        <div className="space-y-2">
          <h1 className="text-xl sm:text-3xl font-bold text-foreground break-words">
            Olá, {isMobile ? corretor.nome_completo.split(' ')[0] : corretor.nome_completo}!
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Acompanhe suas métricas de correção
          </p>
        </div>


        {/* Cards de métricas */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
          <MetricCard
            title="Média"
            value={metricas.mediaNota}
            icon={TrendingUp}
          />
          <MetricCard
            title="Pendências"
            value={metricas.totalPendencias}
            icon={Clock}
          />
          <MetricCard
            title="Envios"
            value={metricas.totalEnvios}
            icon={FileText}
          />
        </div>

        {/* Gráficos */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          <ChartCard
            title="Evolução de notas por mês"
            data={metricas.evolucaoNotasPorMes}
            dataKey="nota"
            color="#8b5cf6"
          />
          <ChartCard
            title="Evolução número de envios por mês"
            data={metricas.evolucaoEnviosPorMes}
            dataKey="envios"
            color="#8b5cf6"
          />
        </div>
      </div>
    </CorretorLayout>
  );
};

export default CorretorDashboard;