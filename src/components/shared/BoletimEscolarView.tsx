import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FileText,
  ClipboardCheck,
  NotebookPen,
  Presentation,
  Video,
  GraduationCap,
  CalendarCheck,
  Trophy,
  MessageSquareText,
  Award,
  School,
} from "lucide-react";
import { LaboratorioIcon } from "@/components/icons/LaboratorioIcon";
import { JarvisIcon } from "@/components/icons/JarvisIcon";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useAlunoBoletim } from "@/hooks/useAlunoBoletim";

// ── Constantes ───────────────────────────────────────────────────────────────

const MESES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

const MENSAGEM_PADRAO =
  "Continue se dedicando. A consistência é o caminho para resultados mais fortes ao longo da preparação. Estamos juntos nessa jornada!";

// ── Helpers ──────────────────────────────────────────────────────────────────

function getNivel(percent: number | null): { label: string; color: string } {
  if (percent === null) return { label: "Sem dados", color: "#94a3b8" };
  if (percent >= 90) return { label: "Excelente", color: "#10b981" };
  if (percent >= 75) return { label: "Muito bom", color: "#3b82f6" };
  if (percent >= 60) return { label: "Bom desempenho", color: "#6366f1" };
  if (percent >= 40) return { label: "Em evolução", color: "#f59e0b" };
  return { label: "Atenção necessária", color: "#ef4444" };
}

function getNivelContagem(count: number, limites: [number, number, number, number]): { label: string; color: string } {
  const [ex, mb, bom, ev] = limites;
  if (count >= ex) return { label: "Excelente", color: "#10b981" };
  if (count >= mb) return { label: "Muito bom", color: "#3b82f6" };
  if (count >= bom) return { label: "Bom engajamento", color: "#6366f1" };
  if (count >= ev) return { label: "Em evolução", color: "#f59e0b" };
  return { label: "Sem dados", color: "#94a3b8" };
}

function gerarFrase(key: string, percent: number | null, count: number): string {
  if (percent === null && count === 0) return "Sem registros neste período.";

  const map: Record<string, (p: number | null, c: number) => string> = {
    redacoes_regulares: (p, c) =>
      c === 0 ? "Nenhuma redação enviada neste período."
        : p !== null && p >= 80 ? `Ótimo desempenho nas ${c} redação${c > 1 ? "ões" : ""} enviadas. Continue com consistência e repertório variado.`
        : p !== null && p >= 60 ? `Há espaço para consolidar argumentação. Revise as competências com nota mais baixa.`
        : p !== null ? `Regularidade e revisão das competências são recomendadas para elevar o desempenho.`
        : `${c} redação${c > 1 ? "ões" : ""} enviada${c > 1 ? "s" : ""} no período. Aguardando correção.`,
    simulados: (p, c) =>
      c === 0 ? "Nenhum simulado enviado neste período."
        : p !== null && p >= 80 ? `Desempenho sólido nos ${c} simulado${c > 1 ? "s" : ""} — domínio das competências avaliadas.`
        : p !== null && p >= 60 ? `Rendimento nos simulados pode melhorar. Ampliar a estabilidade entre competências eleva a nota.`
        : p !== null ? `Reforce o contato com a banca e repita simulações para ganhar confiança.`
        : `${c} simulado${c > 1 ? "s" : ""} enviado${c > 1 ? "s" : ""}. Aguardando correção.`,
    exercicios: (_, c) =>
      c >= 8 ? `${c} exercícios realizados — dedicação consistente às atividades práticas.`
        : c >= 4 ? `${c} exercícios concluídos. Aumentar a frequência pode acelerar a evolução.`
        : c > 0 ? `${c} exercício${c > 1 ? "s" : ""} realizado${c > 1 ? "s" : ""}. Maior regularidade é recomendada.`
        : "Sem registros de exercícios neste período.",
    lousa: (_, c) =>
      c >= 6 ? `${c} atividades de Lousa concluídas — engajamento consistente com as práticas do professor.`
        : c >= 3 ? `${c} Lousas concluídas. Ampliar a participação reforça as habilidades trabalhadas.`
        : c > 0 ? `${c} participação${c > 1 ? "ões" : ""} em Lousa. Há espaço para maior engajamento.`
        : "Sem registros de Lousa neste período.",
    laboratorio_repertorio: (_, c) =>
      c >= 10 ? `${c} conteúdos concluídos no Laboratório — base temática bem desenvolvida.`
        : c >= 5 ? `${c} itens avançados no Laboratório. Maior consistência amplia o repertório nas redações.`
        : c > 0 ? `${c} item${c > 1 ? "ns" : ""} concluído${c > 1 ? "s" : ""}. Manter o hábito é essencial para o crescimento.`
        : "Sem registros no Laboratório de Repertório neste período.",
    videoteca: (_, c) =>
      c >= 6 ? `${c} conteúdos da Videoteca assistidos — repertório sociocultural enriquecido.`
        : c >= 3 ? `${c} vídeos assistidos. O acesso regular contribui para a qualidade argumentativa.`
        : c > 0 ? `${c} vídeo${c > 1 ? "s" : ""} assistido${c > 1 ? "s" : ""}. Ampliar esse uso enriquece as redações.`
        : "Sem registros na Videoteca neste período.",
    aulas_gravadas: (_, c) =>
      c >= 6 ? `${c} aulas gravadas assistidas — comprometimento com o aprendizado autônomo.`
        : c >= 3 ? `${c} aulas gravadas acessadas. Mais consumo de conteúdo acelera o progresso.`
        : c > 0 ? `${c} acesso${c > 1 ? "s" : ""} a aulas gravadas no período.`
        : "Sem registros de aulas gravadas neste período.",
  };

  return map[key]?.(percent, count) ?? "Sem dados suficientes para análise.";
}

// ── Sub-componentes ──────────────────────────────────────────────────────────

interface ModuleCardProps {
  Icon: React.ElementType;
  title: string;
  count: number;
  countLabel: string;
  avgGrade?: number | null;
  level: string;
  levelColor: string;
  summary: string;
  percent: number | null;
  bgColor: string;
  grades?: (number | null)[];
}

function ModuleCard({ Icon, title, count, countLabel, avgGrade, level, levelColor, summary, percent, bgColor, grades }: ModuleCardProps) {
  return (
    <div className="rounded-2xl border bg-card shadow-sm p-4 flex gap-3 items-start">
      <div className={`shrink-0 p-3 rounded-xl ${bgColor}`}>
        <Icon className="w-6 h-6 text-slate-800" strokeWidth={1.8} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center justify-between gap-1.5">
          <h3 className="text-sm font-bold text-foreground">{title}</h3>
          <span
            className="text-xs font-semibold px-2 py-0.5 rounded-full"
            style={{ backgroundColor: levelColor + "20", color: levelColor }}
          >
            {level}
          </span>
        </div>
        <div className="flex items-baseline gap-3 mt-1 flex-wrap">
          <p className="text-2xl font-black text-foreground">
            {count} <span className="text-sm font-semibold text-muted-foreground">{countLabel}</span>
          </p>
          {avgGrade !== null && avgGrade !== undefined && (
            <p className="text-lg font-black" style={{ color: levelColor }}>
              {Math.round(avgGrade)} <span className="text-xs font-semibold text-muted-foreground">pts (média)</span>
            </p>
          )}
        </div>
        {grades && grades.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-1.5">
            {grades.filter((g): g is number => g !== null).map((g, i) => (
              <span
                key={i}
                className="text-xs font-bold px-2 py-0.5 rounded-md"
                style={{ backgroundColor: levelColor + "18", color: levelColor }}
              >
                {Math.round(g)}
              </span>
            ))}
          </div>
        )}
        <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">{summary}</p>
        {percent !== null && percent > 0 && (
          <div className="mt-2.5 h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
            <div
              className="h-1.5 rounded-full transition-all duration-700"
              style={{ width: `${Math.min(percent, 100)}%`, backgroundColor: levelColor }}
            />
          </div>
        )}
      </div>
    </div>
  );
}

function MetricBlock({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border bg-card shadow-sm p-4">
      <h3 className="text-xs font-black uppercase tracking-widest text-foreground mb-3">{title}</h3>
      {children}
    </div>
  );
}

function SkeletonBoletim() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-28 rounded-2xl" />
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4">
        <div className="space-y-3">
          {Array.from({ length: 7 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}
        </div>
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-32 rounded-2xl" />)}
        </div>
      </div>
    </div>
  );
}

function AvatarFallback({ nome, sobrenome }: { nome: string; sobrenome: string }) {
  return (
    <div className="w-20 h-20 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-2xl font-black shrink-0 border-4 border-background shadow-md">
      {(nome?.[0] ?? "").toUpperCase()}{(sobrenome?.[0] ?? "").toUpperCase()}
    </div>
  );
}

// ── Componente principal ─────────────────────────────────────────────────────

interface BoletimEscolarViewProps {
  email: string | null;
  turma: string | null;
}

export function BoletimEscolarView({ email, turma }: BoletimEscolarViewProps) {
  const navigate = useNavigate();

  const now = new Date();
  const defaultMes = now.getDate() <= 10
    ? (now.getMonth() === 0 ? 12 : now.getMonth())
    : now.getMonth() + 1;
  const defaultAno = now.getDate() <= 10 && now.getMonth() === 0
    ? now.getFullYear() - 1
    : now.getFullYear();

  const [mes, setMes] = useState(defaultMes);
  const [ano, setAno] = useState(defaultAno);

  const anos = Array.from({ length: 4 }, (_, i) => now.getFullYear() - 1 + i);

  const { data, isLoading } = useAlunoBoletim(email, turma, mes, ano);

  // ── Cálculo dos dados dos cards ──────────────────────────────────────────

  const pctRedacoes = data?.metricas.mediaPorTipo.regular !== null && data?.metricas.mediaPorTipo.regular !== undefined
    ? Math.round(data.metricas.mediaPorTipo.regular / 10)
    : null;
  const pctSimulados = data?.metricas.mediaPorTipo.simulado !== null && data?.metricas.mediaPorTipo.simulado !== undefined
    ? Math.round(data.metricas.mediaPorTipo.simulado / 10)
    : null;

  const labTotal = (data?.metricas.totalGuiasConcluidos ?? 0) + (data?.metricas.totalMicroItens ?? 0);

  const frequenciaPercent = data?.metricas.taxaFrequencia ?? 0;
  const { label: freqLabel, color: freqColor } = getNivel(frequenciaPercent > 0 ? frequenciaPercent : null);

  const engPercent = (() => {
    const vals = [
      pctRedacoes,
      pctSimulados,
      frequenciaPercent > 0 ? frequenciaPercent : null,
      (data?.metricas.totalLousas ?? 0) > 0 ? Math.min(100, (data?.metricas.totalLousas ?? 0) * 15) : null,
      (data?.metricas.totalExercicios ?? 0) > 0 ? Math.min(100, (data?.metricas.totalExercicios ?? 0) * 12) : null,
      labTotal > 0 ? Math.min(100, labTotal * 8) : null,
    ].filter((v): v is number => v !== null);
    return vals.length > 0 ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : 0;
  })();

  const redacoesReg = data?.redacoes.filter(r => r.tipo === "regular") ?? [];
  const redacoesSim = data?.redacoes.filter(r => r.tipo === "simulado") ?? [];

  const moduleCards: ModuleCardProps[] = data ? [
    {
      Icon: FileText,
      title: "Redações Regulares",
      count: redacoesReg.length,
      countLabel: redacoesReg.length === 1 ? "enviada" : "enviadas",
      avgGrade: data.metricas.mediaPorTipo.regular,
      grades: redacoesReg.map(r => r.nota_total),
      level: getNivel(pctRedacoes).label,
      levelColor: getNivel(pctRedacoes).color,
      summary: gerarFrase("redacoes_regulares", pctRedacoes, redacoesReg.length),
      percent: pctRedacoes,
      bgColor: "bg-sky-100",
    },
    {
      Icon: ClipboardCheck,
      title: "Simulados",
      count: redacoesSim.length,
      countLabel: redacoesSim.length === 1 ? "enviado" : "enviados",
      avgGrade: data.metricas.mediaPorTipo.simulado,
      grades: redacoesSim.map(r => r.nota_total),
      level: getNivel(pctSimulados).label,
      levelColor: getNivel(pctSimulados).color,
      summary: gerarFrase("simulados", pctSimulados, redacoesSim.length),
      percent: pctSimulados,
      bgColor: "bg-emerald-100",
    },
    {
      Icon: NotebookPen,
      title: "Exercícios",
      count: data.metricas.totalExercicios,
      countLabel: data.metricas.totalExercicios === 1 ? "realizado" : "realizados",
      grades: data.exercicios.map(e => e.nota),
      level: getNivelContagem(data.metricas.totalExercicios, [8, 5, 3, 1]).label,
      levelColor: getNivelContagem(data.metricas.totalExercicios, [8, 5, 3, 1]).color,
      summary: gerarFrase("exercicios", null, data.metricas.totalExercicios),
      percent: data.metricas.totalExercicios > 0 ? Math.min(100, data.metricas.totalExercicios * 12) : null,
      bgColor: "bg-violet-100",
    },
    {
      Icon: Presentation,
      title: "Lousa",
      count: data.metricas.totalLousas,
      countLabel: data.metricas.totalLousas === 1 ? "participação" : "participações",
      grades: data.lousas.map(l => l.nota),
      level: getNivelContagem(data.metricas.totalLousas, [6, 4, 2, 1]).label,
      levelColor: getNivelContagem(data.metricas.totalLousas, [6, 4, 2, 1]).color,
      summary: gerarFrase("lousa", null, data.metricas.totalLousas),
      percent: data.metricas.totalLousas > 0 ? Math.min(100, data.metricas.totalLousas * 15) : null,
      bgColor: "bg-cyan-100",
    },
    {
      Icon: LaboratorioIcon,
      title: "Laboratório de Repertório",
      count: labTotal,
      countLabel: labTotal === 1 ? "concluído" : "concluídos",
      level: getNivelContagem(labTotal, [10, 6, 3, 1]).label,
      levelColor: getNivelContagem(labTotal, [10, 6, 3, 1]).color,
      summary: gerarFrase("laboratorio_repertorio", null, labTotal),
      percent: labTotal > 0 ? Math.min(100, labTotal * 8) : null,
      bgColor: "bg-amber-100",
    },
    {
      Icon: Video,
      title: "Videoteca",
      count: data.metricas.totalVideoteca,
      countLabel: data.metricas.totalVideoteca === 1 ? "vídeo assistido" : "vídeos assistidos",
      level: getNivelContagem(data.metricas.totalVideoteca, [6, 4, 2, 1]).label,
      levelColor: getNivelContagem(data.metricas.totalVideoteca, [6, 4, 2, 1]).color,
      summary: gerarFrase("videoteca", null, data.metricas.totalVideoteca),
      percent: data.metricas.totalVideoteca > 0 ? Math.min(100, data.metricas.totalVideoteca * 15) : null,
      bgColor: "bg-orange-100",
    },
    {
      Icon: GraduationCap,
      title: "Aulas Gravadas",
      count: data.metricas.totalAulasGravadas,
      countLabel: data.metricas.totalAulasGravadas === 1 ? "assistida" : "assistidas",
      level: getNivelContagem(data.metricas.totalAulasGravadas, [6, 4, 2, 1]).label,
      levelColor: getNivelContagem(data.metricas.totalAulasGravadas, [6, 4, 2, 1]).color,
      summary: gerarFrase("aulas_gravadas", null, data.metricas.totalAulasGravadas),
      percent: data.metricas.totalAulasGravadas > 0 ? Math.min(100, data.metricas.totalAulasGravadas * 15) : null,
      bgColor: "bg-purple-100",
    },
  ] : [];

  const top5Posicao = data?.metricas.top5Posicao ?? null;
  const nomeCompleto = data?.aluno
    ? `${data.aluno.nome} ${data.aluno.sobrenome}`
    : "";
  const turmaLabel = data?.aluno?.turma ?? turma ?? "—";

  return (
    <div className="space-y-4">
      {/* ── Controles do período ─────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1.5">
          <Award className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-bold text-foreground">Boletim Escolar</h2>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Select value={mes.toString()} onValueChange={(v) => setMes(Number(v))}>
            <SelectTrigger className="h-8 w-[120px] text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MESES.map((m, i) => (
                <SelectItem key={i + 1} value={(i + 1).toString()} className="text-xs">{m}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={ano.toString()} onValueChange={(v) => setAno(Number(v))}>
            <SelectTrigger className="h-8 w-[80px] text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {anos.map((a) => (
                <SelectItem key={a} value={a.toString()} className="text-xs">{a}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {isLoading ? (
        <SkeletonBoletim />
      ) : !data ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-3">
          <Award className="h-12 w-12 opacity-20" />
          <p className="text-sm">Nenhum dado disponível para este período.</p>
        </div>
      ) : (
        <div className="space-y-4">

          {/* ── Cabeçalho do aluno ──────────────────────────────── */}
          <div className="rounded-2xl border bg-card shadow-sm p-4 flex flex-wrap items-center gap-4">
            {data.aluno?.avatar_url ? (
              <img
                src={data.aluno.avatar_url}
                alt="Foto do aluno"
                className="w-20 h-20 rounded-full object-cover border-4 border-background shadow-md shrink-0"
                onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
              />
            ) : (
              <AvatarFallback
                nome={data.aluno?.nome ?? ""}
                sobrenome={data.aluno?.sobrenome ?? ""}
              />
            )}
            <div className="flex-1 min-w-0">
              <h2 className="text-2xl font-black text-foreground leading-tight break-words">
                {nomeCompleto || "—"}
              </h2>
              <p className="text-sm font-semibold text-muted-foreground mt-0.5">
                {turmaLabel}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Laboratório do Redator · {MESES[mes - 1]}/{ano}
              </p>
              {(data.aluno?.escola || data.aluno?.serie) && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {data.aluno.escola && (
                    <Badge variant="secondary" className="text-xs flex items-center gap-1">
                      <School className="w-3 h-3" />
                      {data.aluno.escola}
                    </Badge>
                  )}
                  {data.aluno.serie && (
                    <Badge variant="outline" className="text-xs">{data.aluno.serie}</Badge>
                  )}
                </div>
              )}
            </div>
            <img
              src="/lovable-uploads/680e47a8-eb97-4ceb-b36b-374cdf9f9c86.png"
              alt="Laboratório do Redator"
              className="h-14 w-14 rounded-xl object-contain shrink-0"
              onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
            />
          </div>

          {/* ── Layout principal: cards + sidebar ──────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-4 items-start">

            {/* Coluna de módulos */}
            <div className="space-y-3">
              {moduleCards.map((card) => (
                <ModuleCard key={card.title} {...card} />
              ))}

              {moduleCards.every(c => c.count === 0) && (
                <div className="rounded-2xl border border-dashed bg-muted/30 p-8 text-center text-muted-foreground">
                  <Award className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">Nenhuma atividade registrada neste período.</p>
                  <p className="text-xs mt-1 opacity-70">Tente selecionar outro mês.</p>
                </div>
              )}
            </div>

            {/* Sidebar de métricas */}
            <div className="space-y-3">

              {/* Frequência + Engajamento */}
              <MetricBlock title="Métricas principais">
                <div className="flex items-center gap-3 pb-3 border-b border-border">
                  <div className="shrink-0 w-14 h-14 rounded-xl bg-teal-100 flex items-center justify-center">
                    <CalendarCheck className="w-7 h-7 text-slate-800" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-2xl font-black text-foreground">{frequenciaPercent.toFixed(0)}%</p>
                    <p className="text-xs font-semibold text-foreground leading-tight">frequência em aulas ao vivo</p>
                    {data.metricas.totalAulasNoPeriodo > 0 ? (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {data.metricas.totalPresencas}/{data.metricas.totalAulasNoPeriodo} aulas
                      </p>
                    ) : (
                      <p className="text-xs text-muted-foreground mt-0.5">Nenhuma aula prevista.</p>
                    )}
                  </div>
                </div>
                {frequenciaPercent > 0 && (
                  <div className="mt-1.5 h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className="h-1.5 rounded-full"
                      style={{ width: `${Math.min(frequenciaPercent, 100)}%`, backgroundColor: freqColor }}
                    />
                  </div>
                )}

                <div className="flex items-center gap-3 pt-3 mt-1">
                  <div className="shrink-0 w-14 h-14 rounded-xl bg-indigo-100 flex items-center justify-center">
                    <span className="text-xl font-black text-slate-800">{engPercent}%</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-foreground">engajamento geral</p>
                    <p className="text-xs text-muted-foreground mt-0.5 leading-snug">
                      {engPercent === 0
                        ? "Dados insuficientes para calcular o engajamento."
                        : "Calculado a partir dos módulos com participação registrada."}
                    </p>
                  </div>
                </div>
                {engPercent > 0 && (
                  <div className="mt-1.5 h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className="h-1.5 rounded-full bg-indigo-400"
                      style={{ width: `${Math.min(engPercent, 100)}%` }}
                    />
                  </div>
                )}
              </MetricBlock>

              {/* Jarvis */}
              <MetricBlock title="Jarvis">
                <div className="flex items-center gap-3">
                  <div className="shrink-0 w-14 h-14 rounded-xl bg-violet-100 flex items-center justify-center">
                    <JarvisIcon size={28} className="text-violet-700" />
                  </div>
                  <div className="flex-1 min-w-0">
                    {data.jarvis.totalInteracoes > 0 ? (
                      <>
                        <p className="text-2xl font-black text-foreground">
                          {data.jarvis.totalInteracoes}
                        </p>
                        <p className="text-xs font-semibold text-foreground">
                          {data.jarvis.totalInteracoes === 1 ? "interação" : "interações"} com o Jarvis
                        </p>
                        {data.jarvis.modos.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1.5">
                            {data.jarvis.modos.map(({ label, count }) => (
                              <span
                                key={label}
                                className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-violet-100 text-violet-700"
                              >
                                {label} ×{count}
                              </span>
                            ))}
                          </div>
                        )}
                      </>
                    ) : (
                      <>
                        <p className="text-sm font-bold text-muted-foreground">Sem uso neste período</p>
                        <p className="text-xs text-muted-foreground mt-1 leading-snug">
                          O Jarvis auxilia na escrita, análise e correção de redações com IA.
                        </p>
                      </>
                    )}
                  </div>
                </div>
              </MetricBlock>

              {/* Top 5 */}
              <MetricBlock title="Top 5">
                {top5Posicao !== null ? (
                  <button
                    className="w-full text-left"
                    onClick={() => {
                      const mesFormatado = new Date(ano, mes - 1, 1)
                        .toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
                      const mesCapitalizado = mesFormatado.charAt(0).toUpperCase() + mesFormatado.slice(1);
                      navigate(`/top5?mes=${encodeURIComponent(mesCapitalizado)}&tipo=regular`);
                    }}
                  >
                    <div className="flex items-center gap-3 group">
                      <div className="shrink-0 w-14 h-14 rounded-xl bg-amber-100 flex items-center justify-center">
                        <Trophy className="w-7 h-7 text-slate-800" />
                      </div>
                      <div className="flex-1">
                        <p className="text-2xl font-black text-foreground">{top5Posicao}º lugar</p>
                        <p className="text-xs font-semibold text-foreground">no ranking do período</p>
                        <p className="text-xs text-muted-foreground mt-1 leading-snug">
                          Apareceu no Top 5 pela média de notas das redações.
                        </p>
                        <p className="text-xs text-primary font-semibold mt-1.5 group-hover:underline">
                          Ver ranking completo →
                        </p>
                      </div>
                    </div>
                  </button>
                ) : (
                  <div className="flex items-center gap-3">
                    <div className="shrink-0 w-14 h-14 rounded-xl bg-amber-100 flex items-center justify-center">
                      <Trophy className="w-7 h-7 text-slate-800" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-bold text-muted-foreground">Ainda não no Top 5</p>
                      <p className="text-xs text-muted-foreground mt-1 leading-snug">
                        Há evolução possível com maior regularidade de envio e atenção às competências.
                      </p>
                    </div>
                  </div>
                )}
              </MetricBlock>

              {/* Mensagem do professor */}
              <MetricBlock title="Mensagem do professor">
                <div className="flex gap-2.5">
                  <MessageSquareText className="w-5 h-5 shrink-0 text-foreground mt-0.5" />
                  <div>
                    <p className="text-xs leading-relaxed text-muted-foreground">
                      {data.aluno?.mensagem_boletim ?? MENSAGEM_PADRAO}
                    </p>
                    <p className="text-xs font-semibold italic text-foreground mt-3 text-right">
                      Prof. Jardson Brito
                    </p>
                  </div>
                </div>
              </MetricBlock>

            </div>
          </div>
        </div>
      )}
    </div>
  );
}
