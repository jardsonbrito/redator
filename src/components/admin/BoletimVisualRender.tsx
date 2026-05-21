import React from "react";
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
} from "lucide-react";
import { LaboratorioIcon } from "@/components/icons/LaboratorioIcon";
import type { AlunoBoletimDados } from "@/hooks/useAlunoBoletim";

function getNomeMes(mes: number): string {
  const nomes = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
  ];
  return nomes[mes - 1] ?? "";
}

function classificarNivel(percent: number | null): { label: string; color: string } {
  if (percent === null) return { label: "Sem dados", color: "#94a3b8" };
  if (percent >= 90) return { label: "Excelente", color: "#10b981" };
  if (percent >= 75) return { label: "Muito bom", color: "#3b82f6" };
  if (percent >= 60) return { label: "Bom desempenho", color: "#6366f1" };
  if (percent >= 40) return { label: "Em evolução", color: "#f59e0b" };
  return { label: "Atenção necessária", color: "#ef4444" };
}

function classificarNivelContagem(count: number, limites: [number, number, number, number]): { label: string; color: string } {
  const [ex, mb, bom, ev] = limites;
  if (count >= ex) return { label: "Excelente", color: "#10b981" };
  if (count >= mb) return { label: "Muito bom", color: "#3b82f6" };
  if (count >= bom) return { label: "Bom engajamento", color: "#6366f1" };
  if (count >= ev) return { label: "Em evolução", color: "#f59e0b" };
  return { label: "Atenção necessária", color: "#ef4444" };
}

function gerarFrase(moduleKey: string, percent: number | null, count: number): string {
  if (percent === null && count === 0) return "Sem registros neste período.";

  const frases: Record<string, (p: number | null, c: number) => string> = {
    redacoes_regulares: (p, c) =>
      c === 0 ? "Nenhuma redação enviada neste período."
        : p !== null && p >= 80 ? `Ótimo desempenho nas ${c} redação${c > 1 ? "ões" : ""} enviadas. Continue com consistência e repertório variado.`
        : p !== null && p >= 60 ? `Há espaço para consolidar argumentação. Revise as competências com nota mais baixa.`
        : p !== null ? `Regularidade e revisão das competências são recomendadas para elevar o desempenho.`
        : `${c} redação${c > 1 ? "ões" : ""} enviada${c > 1 ? "s" : ""} no período. Aguardando correção.`,
    simulados: (p, c) =>
      c === 0 ? "Nenhum simulado enviado neste período."
        : p !== null && p >= 80 ? `Desempenho sólido nos ${c} simulado${c > 1 ? "s" : ""} — domínio das competências avaliadas.`
        : p !== null && p >= 60 ? `Rendimento pode melhorar. Ampliar a estabilidade entre competências eleva a nota.`
        : p !== null ? `Reforce o contato com a banca e repita simulações para ganhar confiança.`
        : `${c} simulado${c > 1 ? "s" : ""} enviado${c > 1 ? "s" : ""}. Aguardando correção.`,
    exercicios: (_, c) =>
      c >= 8 ? `${c} exercícios realizados — dedicação consistente às atividades práticas.`
        : c >= 4 ? `${c} exercícios concluídos. Aumentar a frequência pode acelerar a evolução.`
        : c > 0 ? `${c} exercício${c > 1 ? "s" : ""} realizado${c > 1 ? "s" : ""}. Maior regularidade é recomendada.`
        : "Sem registros de exercícios neste período.",
    lousa: (_, c) =>
      c >= 6 ? `${c} atividades de Lousa concluídas — engajamento consistente.`
        : c >= 3 ? `${c} Lousas concluídas. Ampliar a participação reforça as habilidades.`
        : c > 0 ? `${c} participação${c > 1 ? "ões" : ""} em Lousa. Há espaço para mais engajamento.`
        : "Sem registros de Lousa neste período.",
    laboratorio_repertorio: (_, c) =>
      c >= 10 ? `${c} conteúdos concluídos no Laboratório — base temática bem desenvolvida.`
        : c >= 5 ? `${c} itens avançados no Laboratório. Maior consistência amplia o repertório.`
        : c > 0 ? `${c} item${c > 1 ? "ns" : ""} concluído${c > 1 ? "s" : ""}. Manter o hábito é essencial para o crescimento.`
        : "Sem registros no Laboratório de Repertório neste período.",
    videoteca: (_, c) =>
      c >= 6 ? `${c} conteúdos da Videoteca assistidos — repertório sociocultural enriquecido.`
        : c >= 3 ? `${c} vídeos assistidos. O acesso regular contribui para a argumentação.`
        : c > 0 ? `${c} vídeo${c > 1 ? "s" : ""} assistido${c > 1 ? "s" : ""}. Ampliar esse uso enriquece as redações.`
        : "Sem registros na Videoteca neste período.",
    aulas_gravadas: (_, c) =>
      c >= 6 ? `${c} aulas gravadas assistidas — comprometimento com o aprendizado autônomo.`
        : c >= 3 ? `${c} aulas gravadas acessadas. Mais consumo de conteúdo acelera o progresso.`
        : c > 0 ? `${c} acesso${c > 1 ? "s" : ""} a aulas gravadas no período.`
        : "Sem registros de aulas gravadas neste período.",
  };

  const fn = frases[moduleKey];
  return fn ? fn(percent, count) : "Sem dados suficientes para análise.";
}

function gerarProgressao(valor: number, pontos = 7): number[] {
  if (valor <= 0) return Array(pontos).fill(0);
  const inicio = Math.max(5, valor * 0.35);
  return Array.from({ length: pontos }, (_, i) => {
    const t = i / (pontos - 1);
    const eased = Math.pow(t, 0.65);
    return Math.round(inicio + (valor - inicio) * eased);
  });
}

function gerarProgressaoDeNotas(notas: number[], pontos = 7): number[] {
  if (notas.length === 0) return Array(pontos).fill(0);
  const normalizadas = notas.map((n) => Math.round(n / 10));
  if (normalizadas.length >= pontos) return normalizadas.slice(-pontos);
  const primeiro = normalizadas[0];
  const padding = Array.from({ length: pontos - normalizadas.length }, (_, i) =>
    Math.max(0, Math.round(primeiro * (i + 1) / (pontos - normalizadas.length + 1)))
  );
  return [...padding, ...normalizadas];
}

// ──────────────────────────── Sub-componentes ────────────────────────────────

function ProgressChart({ data }: { data: number[] }) {
  const width = 132;
  const height = 52;
  const paddingX = 8;
  const paddingY = 7;
  const innerW = width - paddingX * 2;
  const innerH = height - paddingY * 2;
  const max = 100;
  const barGap = 4;
  const barWidth = (innerW - barGap * (data.length - 1)) / data.length;

  const points = data
    .map((v, i) => {
      const x = paddingX + i * (barWidth + barGap) + barWidth / 2;
      const y = paddingY + innerH - (Math.min(v, max) / max) * innerH;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <div
      style={{
        borderRadius: 10,
        border: "1px solid #e2e8f0",
        backgroundColor: "#f8fafc",
        padding: "6px 8px",
        boxShadow: "inset 0 1px 3px rgba(0,0,0,0.06)",
      }}
    >
      <svg viewBox={`0 0 ${width} ${height}`} style={{ width: 132, height: 52 }}>
        {[41, 28, 15].map((lineY) => (
          <line key={lineY} x1={0} y1={lineY} x2={width} y2={lineY} stroke="#e2e8f0" strokeWidth={0.8} />
        ))}
        {data.map((v, i) => {
          const bh = Math.max(6, (Math.min(v, max) / max) * innerH);
          const x = paddingX + i * (barWidth + barGap);
          const y = paddingY + innerH - bh;
          return (
            <rect key={i} x={x} y={y} width={barWidth} height={bh} rx={2} fill="#cbd5e1" />
          );
        })}
        <polyline points={points} fill="none" stroke="#1e293b" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        {data.map((v, i) => {
          const x = paddingX + i * (barWidth + barGap) + barWidth / 2;
          const y = paddingY + innerH - (Math.min(v, max) / max) * innerH;
          return <circle key={i} cx={x} cy={y} r={2.2} fill="white" stroke="#1e293b" strokeWidth={1.4} />;
        })}
      </svg>
    </div>
  );
}

function MiniBars({ value }: { value: number }) {
  const bars = [Math.max(18, value * 0.4), Math.max(18, value * 0.55), Math.max(18, value * 0.65), Math.max(18, value * 0.78), Math.max(18, value * 0.9), value];
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 5, height: 64 }}>
      {bars.map((b, i) => (
        <div key={i} style={{ width: 12, borderRadius: "3px 3px 0 0", backgroundColor: "#94a3b8", height: `${Math.round(b)}%` }} />
      ))}
    </div>
  );
}

function Donut({ value }: { value: number }) {
  const r = 38;
  const circ = 2 * Math.PI * r;
  const dash = (Math.min(value, 100) / 100) * circ;
  return (
    <svg viewBox="0 0 110 110" style={{ width: 96, height: 96 }}>
      <circle cx={55} cy={55} r={r} fill="none" stroke="#e5e7eb" strokeWidth={15} />
      <circle
        cx={55} cy={55} r={r} fill="none"
        stroke="#94a3b8" strokeWidth={15}
        strokeDasharray={`${dash} ${circ - dash}`}
        strokeLinecap="round"
        transform="rotate(-90 55 55)"
      />
      <text x={55} y={62} textAnchor="middle" style={{ fontSize: 18, fontWeight: 900, fill: "#0f172a" }}>
        {value}%
      </text>
    </svg>
  );
}

function AvatarFallback({ nome, sobrenome }: { nome: string; sobrenome: string }) {
  const initials = `${nome?.[0] ?? ""}${sobrenome?.[0] ?? ""}`.toUpperCase();
  return (
    <div
      style={{
        width: 80, height: 80, borderRadius: "50%",
        backgroundColor: "#6366f1", color: "#fff",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 28, fontWeight: 900, border: "4px solid #fff",
        boxShadow: "0 2px 8px rgba(0,0,0,0.15)", flexShrink: 0,
      }}
    >
      {initials}
    </div>
  );
}

interface PerformanceItem {
  moduleKey: string;
  title: string;
  count: number;
  countLabel: string;
  avgGrade?: number | null;
  grades?: (number | null)[];
  level: string;
  levelColor: string;
  summary: string;
  chart: number[];
  bgColor: string;
  Icon: React.ElementType;
}

function PerformanceCard({ item }: { item: PerformanceItem }) {
  const { Icon } = item;
  const validGrades = (item.grades ?? []).filter((g): g is number => g !== null);
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "56px 1fr 136px",
        alignItems: "center",
        gap: 10,
        backgroundColor: "rgba(255,255,255,0.96)",
        borderRadius: 14,
        padding: "8px 12px",
        boxShadow: "0 2px 8px rgba(0,0,0,0.07)",
      }}
    >
      <div
        style={{
          width: 56, height: 56, borderRadius: 12,
          backgroundColor: item.bgColor,
          display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
        }}
      >
        <Icon style={{ width: 28, height: 28, color: "#1e293b" }} strokeWidth={1.8} />
      </div>

      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 12, fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.03em", color: "#0f172a", lineHeight: 1.2 }}>
          {item.title}
        </div>
        {/* Contagem + nota média */}
        <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginTop: 2, flexWrap: "wrap" }}>
          <span style={{ fontSize: 20, fontWeight: 900, color: "#0f172a" }}>
            {item.count}
          </span>
          <span style={{ fontSize: 11, fontWeight: 600, color: "#64748b" }}>
            {item.countLabel}
          </span>
          {item.avgGrade !== null && item.avgGrade !== undefined && (
            <span style={{ fontSize: 16, fontWeight: 900, color: item.levelColor }}>
              {Math.round(item.avgGrade)} <span style={{ fontSize: 10, fontWeight: 600, color: "#94a3b8" }}>pts</span>
            </span>
          )}
          <span style={{ fontSize: 10, fontWeight: 700, color: item.levelColor, backgroundColor: item.levelColor + "18", padding: "1px 6px", borderRadius: 4 }}>
            {item.level}
          </span>
        </div>
        {/* Chips de notas individuais */}
        {validGrades.length > 0 && (
          <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: 3 }}>
            {validGrades.map((g, i) => (
              <span key={i} style={{ fontSize: 10, fontWeight: 700, padding: "1px 6px", borderRadius: 4, backgroundColor: item.levelColor + "18", color: item.levelColor }}>
                {Math.round(g)}
              </span>
            ))}
          </div>
        )}
        <div style={{ fontSize: 10, lineHeight: 1.35, color: "#475569", marginTop: 2, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
          {item.summary}
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
        {item.chart.some(v => v > 0) ? (
          <>
            <span style={{ fontSize: 9, fontWeight: 600, color: "#475569", marginBottom: 3 }}>Progresso</span>
            <ProgressChart data={item.chart} />
          </>
        ) : (
          <div style={{ width: 132, height: 52, borderRadius: 10, border: "1px dashed #cbd5e1", backgroundColor: "#f8fafc", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ fontSize: 10, color: "#94a3b8", fontWeight: 600 }}>Sem histórico</span>
          </div>
        )}
      </div>
    </div>
  );
}

function MetricBox({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div
      style={{
        borderRadius: 16, border: "1px solid #e2e8f0",
        backgroundColor: "rgba(255,255,255,0.9)",
        padding: 14, boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
      }}
    >
      <div style={{ fontSize: 11, fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.07em", color: "#0f172a", marginBottom: 10 }}>
        {title}
      </div>
      {children}
    </div>
  );
}

// ──────────────────────────── Componente principal ───────────────────────────

export interface BoletimVisualRenderProps {
  dados: AlunoBoletimDados;
  mensagemProfessor: string;
  mes: number;
  ano: number;
  logoBase64?: string;
  avatarBase64?: string;
}

export function BoletimVisualRender({ dados, mensagemProfessor, mes, ano, logoBase64, avatarBase64 }: BoletimVisualRenderProps) {
  const { aluno, metricas, evolucaoNotas } = dados;

  const notasReg = evolucaoNotas.filter((e) => e.tipo === "regular").map((e) => e.nota);
  const notasSim = evolucaoNotas.filter((e) => e.tipo === "simulado").map((e) => e.nota);

  const pctRedacoes = metricas.mediaPorTipo.regular !== null
    ? Math.round(metricas.mediaPorTipo.regular / 10)
    : null;
  const pctSimulados = metricas.mediaPorTipo.simulado !== null
    ? Math.round(metricas.mediaPorTipo.simulado / 10)
    : null;
  const pctFrequencia = metricas.taxaFrequencia;

  const engPercent = Math.round(
    [
      pctRedacoes,
      pctSimulados,
      pctFrequencia,
      metricas.totalLousas > 0 ? Math.min(100, metricas.totalLousas * 15) : null,
      metricas.totalExercicios > 0 ? Math.min(100, metricas.totalExercicios * 12) : null,
      metricas.totalGuiasConcluidos + metricas.totalMicroItens > 0
        ? Math.min(100, (metricas.totalGuiasConcluidos + metricas.totalMicroItens) * 8)
        : null,
    ]
      .filter((v): v is number => v !== null)
      .reduce((sum, v, _, arr) => sum + v / arr.length, 0) || 0
  );

  const niveisRed = classificarNivel(pctRedacoes);
  const niveisSim = classificarNivel(pctSimulados);
  const niveisExe = classificarNivelContagem(metricas.totalExercicios, [8, 5, 3, 1]);
  const niveisLou = classificarNivelContagem(metricas.totalLousas, [6, 4, 2, 1]);
  const labTotal = metricas.totalGuiasConcluidos + metricas.totalMicroItens;
  const niveisLab = classificarNivelContagem(labTotal, [10, 6, 3, 1]);
  const niveisVid = classificarNivelContagem(metricas.totalVideoteca, [6, 4, 2, 1]);
  const niveisGra = classificarNivelContagem(metricas.totalAulasGravadas, [6, 4, 2, 1]);

  const redacoesReg = dados.redacoes.filter(r => r.tipo === "regular");
  const redacoesSim = dados.redacoes.filter(r => r.tipo === "simulado");

  const moduleCards: PerformanceItem[] = [
    {
      moduleKey: "redacoes_regulares",
      title: "Redações Regulares",
      count: redacoesReg.length,
      countLabel: redacoesReg.length === 1 ? "enviada" : "enviadas",
      avgGrade: metricas.mediaPorTipo.regular,
      grades: redacoesReg.map(r => r.nota_total),
      level: niveisRed.label,
      levelColor: niveisRed.color,
      summary: gerarFrase("redacoes_regulares", pctRedacoes, redacoesReg.length),
      chart: notasReg.length > 0 ? gerarProgressaoDeNotas(notasReg) : gerarProgressao(pctRedacoes ?? 0),
      bgColor: "#e0f2fe",
      Icon: FileText,
    },
    {
      moduleKey: "simulados",
      title: "Simulados",
      count: redacoesSim.length,
      countLabel: redacoesSim.length === 1 ? "enviado" : "enviados",
      avgGrade: metricas.mediaPorTipo.simulado,
      grades: redacoesSim.map(r => r.nota_total),
      level: niveisSim.label,
      levelColor: niveisSim.color,
      summary: gerarFrase("simulados", pctSimulados, redacoesSim.length),
      chart: notasSim.length > 0 ? gerarProgressaoDeNotas(notasSim) : gerarProgressao(pctSimulados ?? 0),
      bgColor: "#d1fae5",
      Icon: ClipboardCheck,
    },
    {
      moduleKey: "exercicios",
      title: "Exercícios",
      count: metricas.totalExercicios,
      countLabel: metricas.totalExercicios === 1 ? "realizado" : "realizados",
      grades: dados.exercicios.map(e => e.nota),
      level: niveisExe.label,
      levelColor: niveisExe.color,
      summary: gerarFrase("exercicios", null, metricas.totalExercicios),
      chart: gerarProgressao(Math.min(100, metricas.totalExercicios * 12)),
      bgColor: "#ede9fe",
      Icon: NotebookPen,
    },
    {
      moduleKey: "lousa",
      title: "Lousa",
      count: metricas.totalLousas,
      countLabel: metricas.totalLousas === 1 ? "participação" : "participações",
      grades: dados.lousas.map(l => l.nota),
      level: niveisLou.label,
      levelColor: niveisLou.color,
      summary: gerarFrase("lousa", null, metricas.totalLousas),
      chart: gerarProgressao(Math.min(100, metricas.totalLousas * 15)),
      bgColor: "#cffafe",
      Icon: Presentation,
    },
    {
      moduleKey: "laboratorio_repertorio",
      title: "Laboratório de Repertório",
      count: labTotal,
      countLabel: labTotal === 1 ? "concluído" : "concluídos",
      level: niveisLab.label,
      levelColor: niveisLab.color,
      summary: gerarFrase("laboratorio_repertorio", null, labTotal),
      chart: gerarProgressao(Math.min(100, labTotal * 8)),
      bgColor: "#fef3c7",
      Icon: LaboratorioIcon,
    },
    {
      moduleKey: "videoteca",
      title: "Videoteca",
      count: metricas.totalVideoteca,
      countLabel: metricas.totalVideoteca === 1 ? "vídeo assistido" : "vídeos assistidos",
      level: niveisVid.label,
      levelColor: niveisVid.color,
      summary: gerarFrase("videoteca", null, metricas.totalVideoteca),
      chart: gerarProgressao(Math.min(100, metricas.totalVideoteca * 15)),
      bgColor: "#ffedd5",
      Icon: Video,
    },
    {
      moduleKey: "aulas_gravadas",
      title: "Aulas Gravadas",
      count: metricas.totalAulasGravadas,
      countLabel: metricas.totalAulasGravadas === 1 ? "assistida" : "assistidas",
      level: niveisGra.label,
      levelColor: niveisGra.color,
      summary: gerarFrase("aulas_gravadas", null, metricas.totalAulasGravadas),
      chart: gerarProgressao(Math.min(100, metricas.totalAulasGravadas * 15)),
      bgColor: "#f3e8ff",
      Icon: GraduationCap,
    },
  ];

  const nomeCompleto = aluno
    ? [aluno.nome, aluno.sobrenome].filter(Boolean).join(" ").toUpperCase()
    : "ALUNO";
  const turmaLabel = aluno?.turma ?? "—";
  const frequenciaPercent = pctFrequencia ?? 0;

  const top5Posicao = metricas.top5Posicao;

  return (
    <div
      id="boletim-visual-root"
      style={{
        width: 1200,
        aspectRatio: "16/10",
        background: "linear-gradient(135deg, #eff6ff 0%, #ffffff 50%, #f0fdf4 100%)",
        borderRadius: 24,
        border: "1px solid #e2e8f0",
        padding: 24,
        boxShadow: "0 20px 60px rgba(0,0,0,0.12)",
        fontFamily: "'Inter', 'Segoe UI', Arial, sans-serif",
        display: "grid",
        gridTemplateColumns: "1.45fr 0.95fr",
        gap: 18,
        boxSizing: "border-box",
      }}
    >
      {/* ── COLUNA PRINCIPAL ─────────────────────────────────────────────────── */}
      <div style={{ display: "flex", flexDirection: "column", gap: 12, minHeight: 0 }}>

        {/* Cabeçalho */}
        <header
          style={{
            position: "relative",
            display: "flex",
            alignItems: "center",
            gap: 16,
            backgroundColor: "rgba(255,255,255,0.85)",
            borderRadius: 16,
            padding: "14px 16px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.07)",
          }}
        >
          {/* Avatar: base64 (PDF) > URL (web) > iniciais */}
          {avatarBase64 || aluno?.avatar_url ? (
            <img
              src={avatarBase64 || aluno!.avatar_url!}
              alt="Foto do aluno"
              crossOrigin="anonymous"
              style={{
                width: 80, height: 80, borderRadius: "50%",
                objectFit: "cover", border: "4px solid #fff",
                boxShadow: "0 2px 8px rgba(0,0,0,0.15)", flexShrink: 0,
              }}
              onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
            />
          ) : (
            <AvatarFallback nome={aluno?.nome ?? ""} sobrenome={aluno?.sobrenome ?? ""} />
          )}

          <div style={{ minWidth: 0, flex: 1 }}>
            {/* Nome sem truncamento — quebra linha se necessário */}
            <div style={{ fontSize: 24, fontWeight: 900, letterSpacing: "-0.01em", color: "#0f172a", lineHeight: 1.15, wordBreak: "break-word" }}>
              {nomeCompleto}
            </div>
            <div style={{ fontSize: 13, fontWeight: 600, color: "#475569", marginTop: 3 }}>
              {turmaLabel}
            </div>
            {(aluno?.escola || aluno?.serie) && (
              <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                {aluno.escola && (
                  <span style={{ fontSize: 11, fontWeight: 600, color: "#0f172a", backgroundColor: "#f1f5f9", borderRadius: 6, padding: "2px 8px", border: "1px solid #e2e8f0" }}>
                    🏫 {aluno.escola}
                  </span>
                )}
                {aluno.serie && (
                  <span style={{ fontSize: 11, fontWeight: 600, color: "#0f172a", backgroundColor: "#f1f5f9", borderRadius: 6, padding: "2px 8px", border: "1px solid #e2e8f0" }}>
                    📚 {aluno.serie}
                  </span>
                )}
              </div>
            )}
            <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>
              Laboratório do Redator · Boletim Escolar · {getNomeMes(mes)}/{ano}
            </div>
          </div>

          {/* Logo: base64 (PDF) > imagem em URL */}
          {logoBase64 ? (
            <img
              src={logoBase64}
              alt="Laboratório do Redator"
              style={{ height: 60, width: 60, borderRadius: 12, objectFit: "contain", flexShrink: 0 }}
            />
          ) : (
            <img
              src="/lovable-uploads/680e47a8-eb97-4ceb-b36b-374cdf9f9c86.png"
              alt="Laboratório do Redator"
              style={{ height: 60, width: 60, borderRadius: 12, objectFit: "contain", flexShrink: 0 }}
              onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
            />
          )}
        </header>

        {/* Cards de módulos */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8, flex: 1 }}>
          {moduleCards.map((item) => (
            <PerformanceCard key={item.moduleKey} item={item} />
          ))}
        </div>
      </div>

      {/* ── SIDEBAR DIREITA ──────────────────────────────────────────────────── */}
      <div
        style={{
          display: "flex", flexDirection: "column", gap: 12,
          backgroundColor: "rgba(255,255,255,0.55)",
          borderRadius: 24, padding: 14,
          boxShadow: "inset 0 1px 4px rgba(0,0,0,0.05)",
        }}
      >
        {/* Métricas principais */}
        <MetricBox title="Métricas principais">
          {/* Frequência */}
          <div style={{ display: "grid", gridTemplateColumns: "90px 1fr", alignItems: "center", gap: 10 }}>
            <MiniBars value={frequenciaPercent} />
            <div>
              <div style={{ fontSize: 26, fontWeight: 900, color: "#0f172a" }}>{frequenciaPercent}%</div>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#1e293b" }}>frequência em aulas ao vivo</div>
              <div style={{ fontSize: 10, color: "#64748b", marginTop: 1 }}>
                {metricas.totalPresencas} presença{metricas.totalPresencas !== 1 ? "s" : ""} de {metricas.totalAulasNoPeriodo} aula{metricas.totalAulasNoPeriodo !== 1 ? "s" : ""} prevista{metricas.totalAulasNoPeriodo !== 1 ? "s" : ""}.
              </div>
            </div>
          </div>

          {/* Engajamento */}
          <div style={{ display: "grid", gridTemplateColumns: "90px 1fr", alignItems: "center", gap: 10, borderTop: "1px solid #e2e8f0", paddingTop: 12, marginTop: 10 }}>
            <Donut value={engPercent} />
            <div>
              <div style={{ fontSize: 26, fontWeight: 900, color: "#0f172a" }}>{engPercent}%</div>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#1e293b" }}>engajamento geral</div>
              <div style={{ fontSize: 10, color: "#64748b", marginTop: 1 }}>Calculado a partir dos módulos com participação registrada.</div>
            </div>
          </div>
        </MetricBox>

        {/* Aulas ao vivo */}
        <MetricBox title="Aulas ao vivo">
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div
              style={{
                width: 72, height: 72, borderRadius: 16, flexShrink: 0,
                backgroundColor: "#ccfbf1",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}
            >
              <CalendarCheck style={{ width: 36, height: 36, color: "#0f172a" }} />
            </div>
            <div>
              <div style={{ fontSize: 26, fontWeight: 900, color: "#0f172a" }}>{frequenciaPercent}%</div>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#1e293b" }}>participação no período</div>
              <div style={{ fontSize: 10, color: "#64748b", marginTop: 4, lineHeight: 1.4 }}>
                {metricas.totalAulasNoPeriodo === 0
                  ? "Nenhuma aula prevista neste período."
                  : `Participou de ${metricas.totalPresencas} das ${metricas.totalAulasNoPeriodo} aulas previstas.`}
              </div>
            </div>
          </div>
        </MetricBox>

        {/* Top 5 */}
        <MetricBox title="Top 5">
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div
              style={{
                width: 72, height: 72, borderRadius: 16, flexShrink: 0,
                backgroundColor: "#fef9c3",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}
            >
              <Trophy style={{ width: 36, height: 36, color: "#0f172a" }} />
            </div>
            <div>
              {top5Posicao !== null ? (
                <>
                  <div style={{ fontSize: 26, fontWeight: 900, color: "#0f172a" }}>{top5Posicao}º lugar</div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "#1e293b" }}>no ranking do período</div>
                  <div style={{ fontSize: 10, color: "#64748b", marginTop: 4, lineHeight: 1.4 }}>
                    Apareceu no Top 5 com base na média de notas das redações.
                  </div>
                </>
              ) : (
                <>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#475569" }}>Ainda não no Top 5</div>
                  <div style={{ fontSize: 10, color: "#64748b", marginTop: 4, lineHeight: 1.4 }}>
                    Há evolução possível com maior regularidade de envio e atenção às competências.
                  </div>
                </>
              )}
            </div>
          </div>
        </MetricBox>

        {/* Mensagem do professor */}
        <MetricBox title="Mensagem do professor">
          <div style={{ display: "flex", gap: 10 }}>
            <MessageSquareText style={{ width: 26, height: 26, flexShrink: 0, color: "#1e293b", marginTop: 2 }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12, lineHeight: 1.55, color: "#334155" }}>
                {mensagemProfessor || "Continue se dedicando! A consistência é o caminho para resultados extraordinários. Estamos juntos nessa jornada."}
              </div>
              <div style={{ marginTop: 10, textAlign: "right", fontSize: 12, fontWeight: 700, fontStyle: "italic", color: "#0f172a" }}>
                Prof. Jardson Brito
              </div>
            </div>
          </div>
        </MetricBox>
      </div>
    </div>
  );
}
