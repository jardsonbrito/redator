import { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  FileDown,
  TrendingUp,
  BookOpen,
  Users,
  Award,
  BarChart3,
  Loader2,
  Calendar,
  Library,
  Map,
  Brain,
  AlertTriangle,
  TrendingDown,
  CheckCircle2,
  Info,
} from "lucide-react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ReferenceLine,
} from "recharts";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useAlunoBoletim } from "@/hooks/useAlunoBoletim";
import { useAlunoScoreHistorico } from "@/hooks/useAlunoScoreHistorico";
import { exportarBoletimPDF } from "@/utils/boletimPDF";
import { calcularScore, classificarFaixa, calcularTendencia, gerarAlertas } from "@/utils/radarScore";
import { RADAR_CONFIG } from "@/config/radarConfig";

interface AlunoBoletimSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  email: string | null;
  turma: string | null;
  nomeAluno: string;
  isBolsista?: boolean;
}

const MESES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

function formatarData(iso: string): string {
  try {
    return format(parseISO(iso), "dd/MM/yyyy", { locale: ptBR });
  } catch {
    return iso.split("T")[0];
  }
}

function MetricCard({
  label,
  value,
  sub,
  color,
  icon: Icon,
}: {
  label: string;
  value: string;
  sub?: string;
  color: string;
  icon: React.ElementType;
}) {
  return (
    <div className="rounded-lg border bg-card p-3 flex flex-col gap-1">
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4" style={{ color }} />
        <span className="text-xs text-muted-foreground font-medium">{label}</span>
      </div>
      <span className="text-2xl font-bold" style={{ color }}>
        {value}
      </span>
      {sub && <span className="text-xs text-muted-foreground">{sub}</span>}
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 mt-6 mb-3">
      <div className="w-1 h-5 rounded-full bg-primary" />
      <h3 className="font-semibold text-sm text-foreground">{children}</h3>
    </div>
  );
}

function SkeletonBoletim() {
  return (
    <div className="space-y-4 p-1">
      <div className="grid grid-cols-3 gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-20 rounded-lg" />
        ))}
      </div>
      <Skeleton className="h-48 rounded-lg" />
      <Skeleton className="h-40 rounded-lg" />
      <Skeleton className="h-40 rounded-lg" />
    </div>
  );
}

// ─── Painel de Score (novo componente interno) ────────────────────────────────

function ScorePanel({
  historico,
  loading,
  isBolsista,
  metricas,
}: {
  historico:  ReturnType<typeof useAlunoScoreHistorico>["data"];
  loading:    boolean;
  isBolsista: boolean;
  metricas:   any;
}) {
  if (loading) {
    return (
      <div className="mt-4 mb-2 space-y-2">
        <Skeleton className="h-24 rounded-xl" />
        <Skeleton className="h-32 rounded-xl" />
      </div>
    );
  }

  if (!historico || historico.length === 0) return null;

  const mesAtual   = historico[historico.length - 1];
  const mesAnterior = historico.length >= 2 ? historico[historico.length - 2] : null;

  const score     = mesAtual.score;
  const faixa     = mesAtual.faixa;
  const tendencia = mesAtual.tendencia;

  const alertas = gerarAlertas(
    historico.map(h => ({ score: h.score, metricas: h.metricas })),
    isBolsista
  );

  // Dados para o gráfico
  const chartData = historico.map(h => ({
    label:  h.label,
    score:  h.score,
  }));

  const corScore = faixa?.cor ?? '#6b7280';

  return (
    <div className="mt-4 mb-1 space-y-3">
      {/* Score + status composto */}
      <div
        className="rounded-xl p-4 border-l-4"
        style={{ backgroundColor: faixa?.bg ?? '#f9fafb', borderLeftColor: corScore }}
      >
        <div className="flex items-start gap-4">
          {/* Score grande */}
          <div className="text-center shrink-0">
            {score !== null ? (
              <>
                <div className="text-3xl font-black tabular-nums" style={{ color: corScore }}>
                  {score.toFixed(1)}
                </div>
                <div className="text-[10px] text-muted-foreground font-medium">/ 10,0</div>
              </>
            ) : (
              <div className="text-2xl font-bold text-gray-300">—</div>
            )}
          </div>

          {/* Faixa + tendência + status */}
          <div className="flex-1 min-w-0">
            {faixa ? (
              <div className="text-sm font-bold" style={{ color: faixa.corTexto }}>
                {faixa.label}
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">Sem dados suficientes</div>
            )}

            {tendencia && (
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-xs font-semibold" style={{ color: tendencia.cor }}>
                  {tendencia.icone} {tendencia.label}
                </span>
                <span className="text-xs text-muted-foreground">
                  ({tendencia.delta > 0 ? '+' : ''}{tendencia.delta.toFixed(1)} vs mês anterior)
                </span>
              </div>
            )}

            {mesAnterior?.score !== null && mesAnterior && (
              <div className="text-[10px] text-muted-foreground mt-0.5">
                Mês anterior: {mesAnterior.score?.toFixed(1) ?? '—'}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Gráfico de evolução dos últimos 4 meses */}
      <div className="rounded-xl border bg-card p-3">
        <p className="text-xs font-semibold text-muted-foreground mb-2">Evolução (últimos 4 meses)</p>
        <ResponsiveContainer width="100%" height={110}>
          <BarChart data={chartData} margin={{ top: 10, right: 8, bottom: 0, left: -20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f5" vertical={false} />
            <XAxis dataKey="label" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
            <YAxis domain={[0, 10]} ticks={[0, 5, 7, 10]} tick={{ fontSize: 9 }} tickLine={false} axisLine={false} />
            <Tooltip
              formatter={(v: number) => [v?.toFixed(1) ?? '—', 'Score']}
              contentStyle={{ fontSize: 11, borderRadius: 8 }}
            />
            <ReferenceLine y={7} stroke="#3b82f6" strokeDasharray="4 4" strokeWidth={1} label={{ value: 'meta', fontSize: 9, fill: '#3b82f6', position: 'right' }} />
            <Bar dataKey="score" radius={[4, 4, 0, 0]}>
              {chartData.map((entry, i) => {
                const f = entry.score !== null ? classificarFaixa(entry.score) : null;
                return <Cell key={i} fill={f?.cor ?? '#e5e7eb'} />;
              })}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Alertas automáticos */}
      {alertas.length > 0 && (
        <div className="space-y-1.5">
          {alertas.map((a, i) => {
            const Icon = a.tipo === 'alerta' ? AlertTriangle
                       : a.tipo === 'positivo' ? CheckCircle2
                       : Info;
            const cor  = a.tipo === 'alerta'   ? '#ef4444'
                       : a.tipo === 'positivo' ? '#10b981'
                       : '#6b7280';
            return (
              <div key={i} className="flex items-start gap-2 text-xs rounded-lg px-3 py-2"
                style={{ backgroundColor: `${cor}10`, color: cor }}>
                <Icon className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                <span>{a.texto}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Sheet principal ──────────────────────────────────────────────────────────

export function AlunoBoletimSheet({
  open,
  onOpenChange,
  email,
  turma,
  nomeAluno,
  isBolsista = false,
}: AlunoBoletimSheetProps) {
  const now = new Date();
  const defaultMes = now.getDate() <= 10
    ? (now.getMonth() === 0 ? 12 : now.getMonth())
    : now.getMonth() + 1;
  const defaultAno = now.getDate() <= 10 && now.getMonth() === 0
    ? now.getFullYear() - 1
    : now.getFullYear();
  const [mes, setMes] = useState(defaultMes);
  const [ano, setAno] = useState(defaultAno);
  const [exportando, setExportando] = useState(false);

  const { data, isLoading } = useAlunoBoletim(
    open ? email : null,
    open ? turma : null,
    mes,
    ano
  );

  const { data: historico, isLoading: historicoLoading } = useAlunoScoreHistorico(
    open ? email : null,
    open ? turma : null,
    mes,
    ano
  );

  const anos = Array.from({ length: 4 }, (_, i) => now.getFullYear() - 1 + i);

  async function handleExportarPDF() {
    if (!data) return;
    setExportando(true);
    try {
      await exportarBoletimPDF(data, mes, ano);
    } finally {
      setExportando(false);
    }
  }

  const tipoLabel: Record<string, string> = {
    regular: "Regular",
    simulado: "Simulado",
    exercicio: "Exercício",
  };

  const tipoBadgeVariant: Record<string, "default" | "secondary" | "outline"> = {
    regular: "default",
    simulado: "secondary",
    exercicio: "outline",
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-2xl lg:max-w-3xl p-0 flex flex-col"
        onCloseAutoFocus={(e) => e.preventDefault()}
      >
        {/* Header fixo */}
        <SheetHeader className="px-5 pt-5 pb-3 border-b shrink-0">
          <div className="flex items-start justify-between gap-3">
            <div>
              <SheetTitle className="text-base leading-tight">{nomeAluno}</SheetTitle>
              {data?.aluno && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  {data.aluno.email} · Turma {data.aluno.turma ?? "—"}
                  {data.aluno.creditos !== null && (
                    <> · {data.aluno.creditos} créditos</>
                  )}
                </p>
              )}
            </div>
            <Button
              size="sm"
              onClick={handleExportarPDF}
              disabled={!data || isLoading || exportando}
              className="shrink-0"
            >
              {exportando ? (
                <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
              ) : (
                <FileDown className="h-4 w-4 mr-1.5" />
              )}
              Exportar PDF
            </Button>
          </div>

          {/* Filtros de período */}
          <div className="flex items-center gap-2 mt-3">
            <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Período:</span>
            <Select value={mes.toString()} onValueChange={(v) => setMes(Number(v))}>
              <SelectTrigger className="h-7 w-[120px] text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MESES.map((m, i) => (
                  <SelectItem key={i + 1} value={(i + 1).toString()} className="text-xs">
                    {m}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={ano.toString()} onValueChange={(v) => setAno(Number(v))}>
              <SelectTrigger className="h-7 w-[80px] text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {anos.map((a) => (
                  <SelectItem key={a} value={a.toString()} className="text-xs">
                    {a}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </SheetHeader>

        {/* Conteúdo scrollável */}
        <ScrollArea className="flex-1 px-5">
          <div className="pb-8">
            {isLoading ? (
              <div className="pt-4">
                <SkeletonBoletim />
              </div>
            ) : !data ? (
              <div className="flex items-center justify-center h-40 text-muted-foreground text-sm">
                Nenhum dado disponível
              </div>
            ) : (
              <>
                {/* ── Painel de Score Analítico ── */}
                <ScorePanel
                  historico={historico}
                  loading={historicoLoading}
                  isBolsista={isBolsista}
                  metricas={data?.metricas}
                />

                {/* ── Cards de métricas ── */}
                <SectionTitle>Métricas do Período</SectionTitle>
                <div className="grid grid-cols-3 gap-3">
                  <MetricCard
                    label="Redações"
                    value={data.metricas.totalRedacoes.toString()}
                    sub={`Regular: ${data.metricas.mediaPorTipo.regular ?? "—"} · Simulado: ${data.metricas.mediaPorTipo.simulado ?? "—"}`}
                    color="#6366f1"
                    icon={BookOpen}
                  />
                  <MetricCard
                    label="Média Geral"
                    value={
                      data.metricas.mediaGeral !== null
                        ? data.metricas.mediaGeral.toString()
                        : "—"
                    }
                    sub="todas as redações"
                    color="#10b981"
                    icon={Award}
                  />
                  <MetricCard
                    label="Exercícios"
                    value={data.metricas.totalExercicios.toString()}
                    color="#8b5cf6"
                    icon={BarChart3}
                  />
                  <MetricCard
                    label="Presenças"
                    value={`${data.metricas.totalPresencas} / ${data.metricas.totalAulasNoPeriodo}`}
                    sub="aulas confirmadas"
                    color="#f59e0b"
                    icon={Users}
                  />
                  <MetricCard
                    label="Frequência"
                    value={
                      data.metricas.taxaFrequencia !== null
                        ? `${data.metricas.taxaFrequencia}%`
                        : "—"
                    }
                    sub={
                      data.metricas.totalAulasNoPeriodo === 0
                        ? "sem aulas no período"
                        : undefined
                    }
                    color="#ec4899"
                    icon={TrendingUp}
                  />
                  <MetricCard
                    label="Lousas Concluídas"
                    value={data.metricas.totalLousas.toString()}
                    color="#14b8a6"
                    icon={BookOpen}
                  />
                  <MetricCard
                    label="Repertório"
                    value={(data.metricas.totalRepertorio ?? 0).toString()}
                    sub={`${data.metricas.repertorioDetalhe?.paragrafos ?? 0} par. · ${data.metricas.repertorioDetalhe?.frases ?? 0} frases · ${data.metricas.repertorioDetalhe?.obras ?? 0} obras`}
                    color="#f97316"
                    icon={Library}
                  />
                  <MetricCard
                    label="Guia Temático"
                    value={(data.metricas.totalGuiasConcluidos ?? 0).toString()}
                    sub="guias concluídos"
                    color="#7c3aed"
                    icon={Map}
                  />
                  <MetricCard
                    label="Microaprendizagem"
                    value={(data.metricas.totalMicroItens ?? 0).toString()}
                    sub="itens concluídos"
                    color="#06b6d4"
                    icon={Brain}
                  />
                </div>

                {/* ── Evolução de notas ── */}
                {data.evolucaoNotas.length > 0 && (
                  <>
                    <SectionTitle>Evolução das Notas</SectionTitle>
                    <div className="rounded-lg border bg-card p-4">
                      <ResponsiveContainer width="100%" height={180}>
                        <LineChart
                          data={data.evolucaoNotas}
                          margin={{ top: 8, right: 16, bottom: 8, left: 0 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f5" />
                          <XAxis
                            dataKey="label"
                            tick={{ fontSize: 10 }}
                            tickLine={false}
                            axisLine={false}
                          />
                          <YAxis
                            domain={[0, 1000]}
                            ticks={[0, 250, 500, 750, 1000]}
                            tick={{ fontSize: 10 }}
                            tickLine={false}
                            axisLine={false}
                            width={32}
                          />
                          <Tooltip
                            formatter={(value: number) => [value, "Nota"]}
                            labelFormatter={(label) => `Data: ${label}`}
                            contentStyle={{ fontSize: 12, borderRadius: 8 }}
                          />
                          <Line
                            type="monotone"
                            dataKey="nota"
                            stroke="#6366f1"
                            strokeWidth={2}
                            dot={{ fill: "#6366f1", r: 4 }}
                            activeDot={{ r: 6 }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </>
                )}

                {/* ── Competências C1–C5 ── */}
                {data.mediasPorCompetencia.some((c) => c.media > 0) && (
                  <>
                    <SectionTitle>Desempenho por Competência</SectionTitle>
                    <div className="rounded-lg border bg-card p-4">
                      <ResponsiveContainer width="100%" height={160}>
                        <BarChart
                          data={data.mediasPorCompetencia}
                          margin={{ top: 8, right: 16, bottom: 8, left: 0 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f5" />
                          <XAxis
                            dataKey="nome"
                            tick={{ fontSize: 11 }}
                            tickLine={false}
                            axisLine={false}
                          />
                          <YAxis
                            domain={[0, 200]}
                            ticks={[0, 40, 80, 120, 160, 200]}
                            tick={{ fontSize: 10 }}
                            tickLine={false}
                            axisLine={false}
                            width={32}
                          />
                          <Tooltip
                            formatter={(value: number) => [value, "Média"]}
                            contentStyle={{ fontSize: 12, borderRadius: 8 }}
                          />
                          <Bar dataKey="media" radius={[4, 4, 0, 0]}>
                            {data.mediasPorCompetencia.map((entry, index) => (
                              <Cell key={index} fill={entry.cor} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </>
                )}

                {/* ── Engajamento ── */}
                {data.engajamento.some((e) => e.total > 0) && (
                  <>
                    <SectionTitle>Engajamento no Período</SectionTitle>
                    <div className="rounded-lg border bg-card p-4">
                      <ResponsiveContainer width="100%" height={120}>
                        <BarChart
                          data={data.engajamento}
                          layout="vertical"
                          margin={{ top: 4, right: 40, bottom: 4, left: 0 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f5" horizontal={false} />
                          <XAxis
                            type="number"
                            tick={{ fontSize: 10 }}
                            tickLine={false}
                            axisLine={false}
                            allowDecimals={false}
                          />
                          <YAxis
                            type="category"
                            dataKey="tipo"
                            tick={{ fontSize: 10 }}
                            tickLine={false}
                            axisLine={false}
                            width={80}
                          />
                          <Tooltip
                            formatter={(value: number) => [value, "Total"]}
                            contentStyle={{ fontSize: 12, borderRadius: 8 }}
                          />
                          <Bar dataKey="total" radius={[0, 4, 4, 0]}>
                            {data.engajamento.map((entry, index) => (
                              <Cell key={index} fill={entry.cor} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </>
                )}

                {/* ── Tabela de redações ── */}
                {data.redacoes.length > 0 && (
                  <>
                    <SectionTitle>Redações Corrigidas</SectionTitle>
                    <div className="rounded-lg border overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-muted/50">
                            <TableHead className="text-xs">Data</TableHead>
                            <TableHead className="text-xs">Tipo</TableHead>
                            <TableHead className="text-xs">Tema</TableHead>
                            <TableHead className="text-xs text-center">C1</TableHead>
                            <TableHead className="text-xs text-center">C2</TableHead>
                            <TableHead className="text-xs text-center">C3</TableHead>
                            <TableHead className="text-xs text-center">C4</TableHead>
                            <TableHead className="text-xs text-center">C5</TableHead>
                            <TableHead className="text-xs text-center font-semibold">Total</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {data.redacoes.map((r) => (
                            <TableRow key={r.id}>
                              <TableCell className="text-xs">
                                {r.data_envio ? formatarData(r.data_envio) : "—"}
                              </TableCell>
                              <TableCell>
                                <Badge
                                  variant={tipoBadgeVariant[r.tipo]}
                                  className="text-xs"
                                >
                                  {tipoLabel[r.tipo]}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-xs max-w-[140px] truncate" title={r.tema}>
                                {r.tema}
                              </TableCell>
                              <TableCell className="text-xs text-center">{r.nota_c1 ?? "—"}</TableCell>
                              <TableCell className="text-xs text-center">{r.nota_c2 ?? "—"}</TableCell>
                              <TableCell className="text-xs text-center">{r.nota_c3 ?? "—"}</TableCell>
                              <TableCell className="text-xs text-center">{r.nota_c4 ?? "—"}</TableCell>
                              <TableCell className="text-xs text-center">{r.nota_c5 ?? "—"}</TableCell>
                              <TableCell className="text-xs text-center font-bold text-primary">
                                {r.nota_total ?? "—"}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </>
                )}

                {/* ── Tabela de exercícios ── */}
                {data.exercicios.length > 0 && (
                  <>
                    <SectionTitle>Exercícios Realizados</SectionTitle>
                    <div className="rounded-lg border overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-muted/50">
                            <TableHead className="text-xs">Data</TableHead>
                            <TableHead className="text-xs">Exercício</TableHead>
                            <TableHead className="text-xs text-center">Nota</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {data.exercicios.map((e) => (
                            <TableRow key={e.id}>
                              <TableCell className="text-xs">{formatarData(e.data_realizacao)}</TableCell>
                              <TableCell className="text-xs">{e.titulo}</TableCell>
                              <TableCell className="text-xs text-center font-medium">
                                {e.nota !== null ? e.nota : "—"}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </>
                )}

                {/* ── Participações ── */}
                {(data.presencas.length > 0 || data.lousas.length > 0) && (
                  <>
                    <SectionTitle>
                      Participações ({data.presencas.length + data.lousas.length})
                    </SectionTitle>
                    <div className="rounded-lg border overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-muted/50">
                            <TableHead className="text-xs">Data</TableHead>
                            <TableHead className="text-xs">Tipo</TableHead>
                            <TableHead className="text-xs">Detalhe</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {[
                            ...data.presencas.map((p) => ({
                              key: `p-${p.id}`,
                              data: p.data_registro ? formatarData(p.data_registro) : "—",
                              tipo: "Aula ao Vivo",
                              detalhe: p.duracao_minutos ? `${p.duracao_minutos} min` : "—",
                              color: "#f59e0b",
                            })),
                            ...data.lousas.map((l) => ({
                              key: `l-${l.id}`,
                              data: formatarData(l.submitted_at),
                              tipo: "Lousa",
                              detalhe: l.nota !== null ? `Nota: ${l.nota}` : "—",
                              color: "#14b8a6",
                            })),
                          ]
                            .sort((a, b) => a.data.localeCompare(b.data))
                            .map((row) => (
                              <TableRow key={row.key}>
                                <TableCell className="text-xs">{row.data}</TableCell>
                                <TableCell className="text-xs">
                                  <span
                                    className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium"
                                    style={{
                                      backgroundColor: `${row.color}18`,
                                      color: row.color,
                                    }}
                                  >
                                    {row.tipo}
                                  </span>
                                </TableCell>
                                <TableCell className="text-xs text-muted-foreground">
                                  {row.detalhe}
                                </TableCell>
                              </TableRow>
                            ))}
                        </TableBody>
                      </Table>
                    </div>
                  </>
                )}

                {/* Estado vazio geral */}
                {data.metricas.totalRedacoes === 0 &&
                  data.metricas.totalExercicios === 0 &&
                  data.metricas.totalPresencas === 0 &&
                  data.metricas.totalLousas === 0 &&
                  data.metricas.totalRepertorio === 0 &&
                  data.metricas.totalMicroItens === 0 && (
                    <div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-2">
                      <BarChart3 className="h-8 w-8 opacity-30" />
                      <p className="text-sm">Nenhuma atividade registrada neste período</p>
                    </div>
                  )}
              </>
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
