import { Navigate, useNavigate } from "react-router-dom";
import { useCorretorAuth } from "@/hooks/useCorretorAuth";
import { useCorretorPermissoes } from "@/hooks/useCorretorPermissoes";
import { CorretorLayout } from "@/components/corretor/CorretorLayout";
import { useCorretorMetricas } from "@/hooks/useCorretorMetricas";
import { useCorretorRedacoes } from "@/hooks/useCorretorRedacoes";
import { useIsMobile } from "@/hooks/use-mobile";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  TrendingUp, Clock, FileText, CheckCircle2, ArrowRight,
  User, Calendar, BookOpen, Inbox, Loader2
} from "lucide-react";
import { Top5Widget } from "@/components/shared/Top5Widget";
import { detectarGeneroNome, tituloCorretor } from "@/utils/generoUtils";
import { Area, AreaChart, XAxis, YAxis, ResponsiveContainer } from "recharts";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  pendente:     { label: "Pendente",     className: "bg-amber-100 text-amber-700 border-amber-200" },
  em_correcao:  { label: "Em correção",  className: "bg-blue-100 text-blue-700 border-blue-200" },
  incompleta:   { label: "Incompleta",   className: "bg-red-100 text-red-700 border-red-200" },
  corrigida:    { label: "Corrigida",    className: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  devolvida:    { label: "Devolvida",    className: "bg-slate-100 text-slate-600 border-slate-200" },
};

const MetricCard = ({
  title, value, sub, icon: Icon, accent
}: {
  title: string; value: string | number; sub?: string;
  icon: React.ElementType; accent: string;
}) => (
  <Card className="bg-white shadow-sm hover:shadow-md transition-shadow border-0 ring-1 ring-violet-100">
    <CardContent className="p-5">
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">{title}</p>
          <p className="text-3xl font-bold text-slate-900">{value}</p>
          {sub && <p className="text-xs text-slate-400">{sub}</p>}
        </div>
        <div className={`${accent} p-2.5 rounded-xl`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
      </div>
    </CardContent>
  </Card>
);

const ChartCard = ({ title, data, dataKey, color = "#8b5cf6" }: {
  title: string; data: Record<string, string | number>[]; dataKey: string; color?: string;
}) => (
  <Card className="bg-white border-0 ring-1 ring-violet-100 shadow-sm">
    <CardHeader className="pb-2 pt-4 px-5">
      <CardTitle className="text-sm font-semibold text-slate-700">{title}</CardTitle>
    </CardHeader>
    <CardContent className="px-5 pb-4">
      <div className="h-40 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <defs>
              <linearGradient id={`grad-${dataKey}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={color} stopOpacity={0.25} />
                <stop offset="95%" stopColor={color} stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis dataKey="mes" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} width={32} />
            <Area
              type="monotone"
              dataKey={dataKey}
              stroke={color}
              strokeWidth={2.5}
              fill={`url(#grad-${dataKey})`}
              dot={{ fill: color, strokeWidth: 0, r: 3 }}
              activeDot={{ r: 5, fill: color }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </CardContent>
  </Card>
);

const CorretorDashboard = () => {
  const { corretor, loading } = useCorretorAuth();
  const { podeGerenciar } = useCorretorPermissoes();
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const { metricas, loading: loadingMetricas } = useCorretorMetricas(
    corretor?.email || '',
    (corretor?.turmas_autorizadas as string[]) ?? []
  );
  const { getRedacoesPorStatus, loading: loadingRedacoes } = useCorretorRedacoes(corretor?.email || '');

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-violet-50 via-white to-cyan-50">
        <div className="text-center space-y-3">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-violet-600 mx-auto" />
          <p className="text-slate-500 text-sm">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!corretor) return <Navigate to="/corretor/login" replace />;

  const { pendentes, emCorrecao, incompletas, corrigidas } = getRedacoesPorStatus();
  const filaAtiva = [...emCorrecao, ...pendentes, ...incompletas].slice(0, 8);

  const generoCorretor = detectarGeneroNome(corretor.nome_completo ?? '');
  const firstName = corretor.nome_completo?.split(' ')[0] ?? tituloCorretor(generoCorretor);
  const nomeExibido = isMobile ? firstName : corretor.nome_completo;

  const hora = new Date().getHours();
  const saudacao = hora < 12 ? 'Bom dia' : hora < 18 ? 'Boa tarde' : 'Boa noite';

  return (
    <CorretorLayout>
      <div className="space-y-6">

        {/* ── HERO ─────────────────────────────────────────────────────── */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-violet-900 via-violet-700 to-fuchsia-700 p-6 text-white shadow-lg">
          <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-violet-200 text-sm font-medium">{saudacao},</p>
              <h1 className="text-2xl sm:text-3xl font-bold mt-0.5">{nomeExibido}!</h1>
            </div>
            <div className="flex gap-3 flex-wrap sm:flex-nowrap">
              <div className="rounded-xl bg-white/10 backdrop-blur px-4 py-3 min-w-[90px] text-center">
                <p className="text-2xl font-bold">{pendentes.length}</p>
                <p className="text-violet-200 text-xs mt-0.5">Pendentes</p>
              </div>
              <div className="rounded-xl bg-white/10 backdrop-blur px-4 py-3 min-w-[90px] text-center">
                <p className="text-2xl font-bold">{emCorrecao.length}</p>
                <p className="text-violet-200 text-xs mt-0.5">Em correção</p>
              </div>
              <div className="rounded-xl bg-white/10 backdrop-blur px-4 py-3 min-w-[90px] text-center">
                <p className="text-2xl font-bold">{corrigidas.length}</p>
                <p className="text-violet-200 text-xs mt-0.5">Concluídas</p>
              </div>
            </div>
          </div>
          {/* Decorative blobs */}
          <div className="pointer-events-none absolute -top-8 -right-8 h-40 w-40 rounded-full bg-white/5" />
          <div className="pointer-events-none absolute -bottom-10 -left-10 h-52 w-52 rounded-full bg-fuchsia-500/10" />
        </div>

        {/* ── MÉTRICAS ─────────────────────────────────────────────────── */}
        {loadingMetricas ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="w-6 h-6 animate-spin text-violet-500" />
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-2 xl:grid-cols-4 gap-4">
            <MetricCard
              title="Média das notas"
              value={metricas.mediaNota}
              sub="pontos médios"
              icon={TrendingUp}
              accent="bg-violet-600"
            />
            <MetricCard
              title="Pendências"
              value={metricas.totalPendencias}
              sub="aguardando correção"
              icon={Clock}
              accent="bg-amber-500"
            />
            <MetricCard
              title="Em correção"
              value={emCorrecao.length}
              sub="em andamento"
              icon={FileText}
              accent="bg-blue-500"
            />
            <MetricCard
              title="Total de envios"
              value={metricas.totalEnvios}
              sub="redações recebidas"
              icon={CheckCircle2}
              accent="bg-emerald-500"
            />
          </div>
        )}

        {/* ── FILA DE CORREÇÃO ─────────────────────────────────────────── */}
        <Card className="bg-white border-0 ring-1 ring-violet-100 shadow-sm">
          <CardHeader className="pb-3 pt-5 px-5 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base font-semibold text-slate-800">Fila de correção</CardTitle>
            <Button
              variant="ghost"
              size="sm"
              className="text-violet-600 hover:text-violet-700 hover:bg-violet-50 text-xs gap-1 h-7 px-2"
              onClick={() => navigate('/corretor/redacoes-corretor')}
            >
              Ver todas <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </CardHeader>
          <CardContent className="px-5 pb-5">
            {loadingRedacoes ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-5 h-5 animate-spin text-violet-400" />
              </div>
            ) : filaAtiva.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center space-y-2">
                <CheckCircle2 className="w-10 h-10 text-emerald-400" />
                <p className="text-slate-600 font-medium text-sm">Fila zerada!</p>
                <p className="text-slate-400 text-xs">Nenhuma redação pendente no momento.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {filaAtiva.map((r) => {
                  const cfg = STATUS_CONFIG[r.status_minha_correcao] ?? STATUS_CONFIG.pendente;
                  const dataFormatada = (() => {
                    try { return format(parseISO(r.data_envio), "dd/MM/yy", { locale: ptBR }); }
                    catch { return r.data_envio?.slice(0, 10) ?? '—'; }
                  })();
                  return (
                    <div
                      key={r.id}
                      className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50/60 px-3 py-2.5 hover:bg-violet-50/50 hover:border-violet-100 transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-medium text-slate-800 truncate max-w-[140px] sm:max-w-[200px]">
                            {r.nome_aluno || 'Aluno'}
                          </span>
                          <Badge
                            variant="outline"
                            className={`text-[10px] px-1.5 py-0 h-4 border ${cfg.className}`}
                          >
                            {cfg.label}
                          </Badge>
                          {r.turma && (
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 border bg-slate-100 text-slate-500 border-slate-200">
                              {r.turma}
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5 truncate">{r.frase_tematica}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-[11px] text-slate-400 hidden sm:block">{dataFormatada}</span>
                        <Button
                          size="sm"
                          className="h-7 px-2.5 text-xs bg-violet-600 hover:bg-violet-700 text-white rounded-lg"
                          onClick={() => navigate('/corretor/redacoes-corretor')}
                        >
                          Corrigir
                        </Button>
                      </div>
                    </div>
                  );
                })}
                {(pendentes.length + emCorrecao.length + incompletas.length) > 8 && (
                  <button
                    onClick={() => navigate('/corretor/redacoes-corretor')}
                    className="w-full text-center text-xs text-violet-500 hover:text-violet-700 py-2"
                  >
                    + {(pendentes.length + emCorrecao.length + incompletas.length) - 8} mais redações aguardando
                  </button>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* ── FUNCIONALIDADES ──────────────────────────────────────────── */}
        {podeGerenciar && (
          <Card
            className="bg-white border-0 ring-1 ring-violet-100 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
            onClick={() => navigate('/corretor/temas')}
          >
            <CardContent className="flex items-center gap-4 p-5">
              <div className="bg-fuchsia-100 p-3 rounded-xl">
                <BookOpen className="w-5 h-5 text-fuchsia-600" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-slate-800 text-sm">Temas</p>
                <p className="text-xs text-slate-500">Explorar temas disponíveis</p>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-400" />
            </CardContent>
          </Card>
        )}

        {/* ── GRÁFICOS ─────────────────────────────────────────────────── */}
        <div className="grid xl:grid-cols-2 gap-4">
          <ChartCard
            title="Evolução de notas por mês"
            data={metricas.evolucaoNotasPorMes}
            dataKey="nota"
            color="#8b5cf6"
          />
          <ChartCard
            title="Evolução de envios por mês"
            data={metricas.evolucaoEnviosPorMes}
            dataKey="envios"
            color="#06b6d4"
          />
        </div>

        {/* ── GALERIA DE HONRA + TOP 5 (apenas para corretores com turmas externas) */}
        {podeGerenciar && (
          <Top5Widget
            variant="corretor"
            showHeader
            horizontal
            turmasPermitidas={(corretor.turmas_autorizadas as string[]) ?? []}
          />
        )}

      </div>
    </CorretorLayout>
  );
};

export default CorretorDashboard;
