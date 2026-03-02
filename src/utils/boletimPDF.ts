import jsPDF from "jspdf";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import type {
  AlunoBoletimDados,
  MetricasBoletim,
  EvolucaoNota,
  MediaCompetencia,
  DadoEngajamento,
} from "@/hooks/useAlunoBoletim";

const MARGIN = 18;
const PAGE_W = 210;
const PAGE_H = 297;
const CONTENT_W = PAGE_W - MARGIN * 2;
const BRAND_COLOR: [number, number, number] = [109, 93, 213]; // #6D5DD5 (--color-brand hsl 248 59% 60%)
const ACCENT_COLOR: [number, number, number] = [99, 102, 241]; // #6366f1
const GRAY: [number, number, number] = [100, 100, 100];
const LIGHT_GRAY: [number, number, number] = [240, 240, 245];
const WHITE: [number, number, number] = [255, 255, 255];
const BLACK: [number, number, number] = [30, 30, 30];

function getNomeMes(mes: number): string {
  const nomes = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
  ];
  return nomes[mes - 1] ?? "";
}

function formatarData(iso: string): string {
  try {
    return format(parseISO(iso), "dd/MM/yyyy", { locale: ptBR });
  } catch {
    return iso.split("T")[0];
  }
}

function addPageNumber(doc: jsPDF, pageNum: number, totalPages: number) {
  doc.setFontSize(8);
  doc.setTextColor(...GRAY);
  doc.text(
    `Página ${pageNum} de ${totalPages}`,
    PAGE_W / 2,
    PAGE_H - 8,
    { align: "center" }
  );
}

function drawDivider(doc: jsPDF, y: number, color: [number, number, number] = LIGHT_GRAY) {
  doc.setDrawColor(...color);
  doc.setLineWidth(0.3);
  doc.line(MARGIN, y, PAGE_W - MARGIN, y);
}

function sectionTitle(doc: jsPDF, title: string, y: number): number {
  doc.setFillColor(...BRAND_COLOR);
  doc.rect(MARGIN, y, 3, 5, "F");
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...BRAND_COLOR);
  doc.text(title, MARGIN + 6, y + 4);
  return y + 10;
}

function checkPage(doc: jsPDF, y: number, needed = 20): number {
  if (y + needed > PAGE_H - 15) {
    doc.addPage();
    return MARGIN + 4;
  }
  return y;
}

// --- Carregador de imagem ---
async function loadImageAsBase64(url: string): Promise<string> {
  const response = await fetch(url);
  const blob = await response.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

// --- Cabeçalho ---
function drawHeader(
  doc: jsPDF,
  aluno: AlunoBoletimDados["aluno"],
  mes: number,
  ano: number,
  logoBase64?: string
): number {
  // Barra superior
  doc.setFillColor(...BRAND_COLOR);
  doc.rect(0, 0, PAGE_W, 28, "F");

  // Logo (canto esquerdo da barra)
  if (logoBase64) {
    doc.addImage(logoBase64, "PNG", 5, 4, 20, 20);
  }

  // Textos centralizados na área à direita da logo
  const textCenter = logoBase64 ? (28 + PAGE_W) / 2 : PAGE_W / 2;

  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...WHITE);
  doc.text("LABORATÓRIO DO REDATOR", textCenter, 11, { align: "center" });

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text("Boletim Individual de Desempenho", textCenter, 18, { align: "center" });
  doc.text(`${getNomeMes(mes)} / ${ano}`, textCenter, 24, { align: "center" });

  let y = 34;

  if (aluno) {
    doc.setFontSize(13);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...BLACK);
    doc.text(`${aluno.nome} ${aluno.sobrenome}`, MARGIN, y);

    y += 7;
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...GRAY);

    const col2 = MARGIN + CONTENT_W / 2;
    doc.text(`E-mail: ${aluno.email}`, MARGIN, y);
    doc.text(`Turma: ${aluno.turma ?? "—"}`, col2, y);
    y += 5;

    const creditosStr = aluno.creditos !== null ? `${aluno.creditos} créditos` : "—";
    const aprovacaoStr = aluno.data_aprovacao
      ? `Aprovado em ${formatarData(aluno.data_aprovacao)}`
      : "—";
    doc.text(`Créditos: ${creditosStr}`, MARGIN, y);
    doc.text(aprovacaoStr, col2, y);
    y += 5;
  }

  drawDivider(doc, y + 2);
  return y + 8;
}

// --- Cards de métricas (2 linhas de 3) ---
function drawMetricCards(doc: jsPDF, metricas: MetricasBoletim, y: number): number {
  y = checkPage(doc, y, 40);
  y = sectionTitle(doc, "Métricas do Período", y);

  const cardW = (CONTENT_W - 8) / 3;
  const cardH = 18;
  const gap = 4;

  const cards = [
    { label: "Redações", value: metricas.totalRedacoes.toString(), color: ACCENT_COLOR },
    {
      label: "Média Geral",
      value: metricas.mediaGeral !== null ? `${metricas.mediaGeral}` : "—",
      color: [16, 185, 129] as [number, number, number],
    },
    {
      label: "Exercícios",
      value: metricas.totalExercicios.toString(),
      color: [139, 92, 246] as [number, number, number],
    },
    {
      label: "Presenças / Aulas",
      value: `${metricas.totalPresencas} / ${metricas.totalAulasNoPeriodo}`,
      color: [245, 158, 11] as [number, number, number],
    },
    {
      label: "Frequência",
      value: metricas.taxaFrequencia !== null ? `${metricas.taxaFrequencia}%` : "—",
      color: [236, 72, 153] as [number, number, number],
    },
    {
      label: "Lousas Concluídas",
      value: metricas.totalLousas.toString(),
      color: [20, 184, 166] as [number, number, number],
    },
  ];

  for (let row = 0; row < 2; row++) {
    for (let col = 0; col < 3; col++) {
      const card = cards[row * 3 + col];
      const cx = MARGIN + col * (cardW + gap);
      const cy = y + row * (cardH + gap);

      doc.setFillColor(...LIGHT_GRAY);
      doc.roundedRect(cx, cy, cardW, cardH, 2, 2, "F");

      doc.setFillColor(...card.color);
      doc.roundedRect(cx, cy, 3, cardH, 2, 2, "F");

      doc.setFontSize(13);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...card.color);
      doc.text(card.value, cx + cardW / 2 + 1, cy + 9, { align: "center" });

      doc.setFontSize(7);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...GRAY);
      doc.text(card.label, cx + cardW / 2 + 1, cy + 15, { align: "center" });
    }
  }

  // Médias por tipo (abaixo dos cards)
  const rowBottom = y + 2 * (cardH + gap) + 4;
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...GRAY);
  const medReg =
    metricas.mediaPorTipo.regular !== null ? `${metricas.mediaPorTipo.regular}` : "—";
  const medSim =
    metricas.mediaPorTipo.simulado !== null ? `${metricas.mediaPorTipo.simulado}` : "—";
  doc.text(
    `Média por tipo:  Regular: ${medReg}   |   Simulado: ${medSim}`,
    MARGIN,
    rowBottom
  );

  return rowBottom + 8;
}

// --- Gráfico de barras: Competências C1–C5 ---
function drawCompetenciasChart(
  doc: jsPDF,
  competencias: MediaCompetencia[],
  y: number
): number {
  if (competencias.length === 0) return y;
  y = checkPage(doc, y, 60);
  y = sectionTitle(doc, "Desempenho por Competência (média)", y);

  const chartH = 36;
  const maxNota = 200;
  const barW = 20;
  const gap = (CONTENT_W - competencias.length * barW) / (competencias.length + 1);

  competencias.forEach((c, i) => {
    const barH = Math.max(2, (c.media / maxNota) * chartH);
    const bx = MARGIN + gap + i * (barW + gap);
    const by = y + chartH - barH;

    const rgb = hexToRgb(c.cor) ?? ACCENT_COLOR;
    doc.setFillColor(...rgb);
    doc.roundedRect(bx, by, barW, barH, 1, 1, "F");

    // valor
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...BLACK);
    doc.text(c.media > 0 ? c.media.toString() : "—", bx + barW / 2, by - 2, {
      align: "center",
    });

    // rótulo
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...GRAY);
    doc.text(c.nome, bx + barW / 2, y + chartH + 5, { align: "center" });
  });

  // Linha de base
  drawDivider(doc, y + chartH + 0.5, [200, 200, 210]);

  return y + chartH + 12;
}

// --- Gráfico de linha: Evolução de notas ---
function drawEvolucaoChart(doc: jsPDF, evolucao: EvolucaoNota[], y: number): number {
  if (evolucao.length < 2) return y;
  y = checkPage(doc, y, 65);
  y = sectionTitle(doc, "Evolução das Notas", y);

  const chartH = 40;
  const chartW = CONTENT_W;
  const maxNota = 1000;
  const minNota = 0;
  const range = maxNota - minNota;

  // Eixo Y (linhas de grade horizontais)
  const grades = [0, 250, 500, 750, 1000];
  grades.forEach((g) => {
    const gy = y + chartH - (g / range) * chartH;
    doc.setDrawColor(220, 220, 230);
    doc.setLineWidth(0.2);
    doc.line(MARGIN, gy, MARGIN + chartW, gy);
    doc.setFontSize(6);
    doc.setTextColor(...GRAY);
    doc.text(g.toString(), MARGIN - 2, gy + 1, { align: "right" });
  });

  if (evolucao.length === 1) {
    const pt = evolucao[0];
    const px = MARGIN + chartW / 2;
    const py = y + chartH - ((pt.nota - minNota) / range) * chartH;
    doc.setFillColor(...ACCENT_COLOR);
    doc.circle(px, py, 2, "F");
    doc.setFontSize(7);
    doc.setTextColor(...BLACK);
    doc.text(pt.nota.toString(), px, py - 4, { align: "center" });
  } else {
    // Pontos e linhas
    const stepX = chartW / (evolucao.length - 1);
    const points = evolucao.map((pt, i) => ({
      x: MARGIN + i * stepX,
      y: y + chartH - ((pt.nota - minNota) / range) * chartH,
      nota: pt.nota,
      label: pt.label,
    }));

    // Área sob a curva
    doc.setFillColor(99, 102, 241, 0.08);
    const areaPath = [
      [points[0].x, y + chartH],
      ...points.map((p) => [p.x, p.y]),
      [points[points.length - 1].x, y + chartH],
    ];
    // jsPDF não suporta clipPath direto, apenas linhas
    // Desenhar linhas entre pontos
    doc.setDrawColor(...ACCENT_COLOR);
    doc.setLineWidth(1);
    for (let i = 0; i < points.length - 1; i++) {
      doc.line(points[i].x, points[i].y, points[i + 1].x, points[i + 1].y);
    }

    // Pontos
    points.forEach((p) => {
      doc.setFillColor(...ACCENT_COLOR);
      doc.circle(p.x, p.y, 1.5, "F");
      doc.setFontSize(6.5);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...BLACK);
      doc.text(p.nota.toString(), p.x, p.y - 3, { align: "center" });
    });

    // Rótulos do eixo X
    doc.setFontSize(6);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...GRAY);
    const labelStep = Math.ceil(points.length / 8); // máx 8 rótulos
    points.forEach((p, i) => {
      if (i % labelStep === 0 || i === points.length - 1) {
        doc.text(p.label, p.x, y + chartH + 5, { align: "center" });
      }
    });
  }

  drawDivider(doc, y + chartH + 0.5, [200, 200, 210]);
  return y + chartH + 12;
}

// --- Gráfico de barras horizontal: Engajamento ---
function drawEngajamentoChart(doc: jsPDF, engajamento: DadoEngajamento[], y: number): number {
  const comDados = engajamento.filter((e) => e.total > 0);
  if (comDados.length === 0) return y;
  y = checkPage(doc, y, 10 + comDados.length * 10);
  y = sectionTitle(doc, "Engajamento no Período", y);

  const maxVal = Math.max(...comDados.map((e) => e.total), 1);
  const barMaxW = CONTENT_W * 0.65;
  const rowH = 9;

  comDados.forEach((e, i) => {
    const by = y + i * rowH;
    const bw = (e.total / maxVal) * barMaxW;
    const rgb = hexToRgb(e.cor) ?? ACCENT_COLOR;

    // Barra
    doc.setFillColor(...LIGHT_GRAY);
    doc.roundedRect(MARGIN + 38, by, barMaxW, rowH - 2, 1, 1, "F");
    doc.setFillColor(...rgb);
    doc.roundedRect(MARGIN + 38, by, Math.max(bw, 2), rowH - 2, 1, 1, "F");

    // Rótulo
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...BLACK);
    doc.text(e.tipo, MARGIN, by + rowH - 3.5);

    // Valor
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...rgb);
    doc.text(
      e.total.toString(),
      MARGIN + 38 + barMaxW + 3,
      by + rowH - 3.5
    );
  });

  return y + comDados.length * rowH + 6;
}

// --- Tabela de redações ---
function drawRedacoesTable(doc: jsPDF, redacoes: AlunoBoletimDados["redacoes"], y: number): number {
  if (redacoes.length === 0) return y;
  y = checkPage(doc, y, 30);
  y = sectionTitle(doc, "Redações Corrigidas", y);

  const cols = [
    { label: "Data", w: 22 },
    { label: "Tipo", w: 22 },
    { label: "Tema", w: CONTENT_W - 22 - 22 - 14 - 14 - 14 - 14 - 14 },
    { label: "C1", w: 14 },
    { label: "C2", w: 14 },
    { label: "C3", w: 14 },
    { label: "C4", w: 14 },
    { label: "C5", w: 14 },
    { label: "Total", w: 18 },
  ];
  const rowH = 7;

  // Cabeçalho
  doc.setFillColor(...BRAND_COLOR);
  doc.rect(MARGIN, y, CONTENT_W, rowH, "F");
  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...WHITE);
  let cx = MARGIN + 2;
  cols.forEach((col) => {
    doc.text(col.label, cx, y + 5);
    cx += col.w;
  });
  y += rowH;

  // Linhas
  const tipoLabel: Record<string, string> = {
    regular: "Regular",
    simulado: "Simulado",
    exercicio: "Exercício",
  };

  redacoes.forEach((r, idx) => {
    y = checkPage(doc, y, rowH + 2);

    if (idx % 2 === 0) {
      doc.setFillColor(245, 245, 252);
      doc.rect(MARGIN, y, CONTENT_W, rowH, "F");
    }

    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...BLACK);

    let rx = MARGIN + 2;
    const values = [
      r.data_envio ? formatarData(r.data_envio) : "—",
      tipoLabel[r.tipo] ?? r.tipo,
      doc.splitTextToSize(r.tema, cols[2].w - 2)[0], // trunca
      r.nota_c1?.toString() ?? "—",
      r.nota_c2?.toString() ?? "—",
      r.nota_c3?.toString() ?? "—",
      r.nota_c4?.toString() ?? "—",
      r.nota_c5?.toString() ?? "—",
      r.nota_total?.toString() ?? "—",
    ];

    values.forEach((v, vi) => {
      if (vi === 8 && r.nota_total !== null) {
        doc.setFont("helvetica", "bold");
        doc.setTextColor(...BRAND_COLOR);
      }
      doc.text(v, rx, y + 5);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...BLACK);
      rx += cols[vi].w;
    });

    drawDivider(doc, y + rowH, [225, 225, 235]);
    y += rowH;
  });

  return y + 6;
}

// --- Tabela de exercícios ---
function drawExerciciosTable(
  doc: jsPDF,
  exercicios: AlunoBoletimDados["exercicios"],
  y: number
): number {
  if (exercicios.length === 0) return y;
  y = checkPage(doc, y, 30);
  y = sectionTitle(doc, "Exercícios Realizados", y);

  const cols = [
    { label: "Data", w: 28 },
    { label: "Exercício", w: CONTENT_W - 28 - 22 },
    { label: "Nota", w: 22 },
  ];
  const rowH = 7;

  doc.setFillColor(...BRAND_COLOR);
  doc.rect(MARGIN, y, CONTENT_W, rowH, "F");
  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...WHITE);
  let cx = MARGIN + 2;
  cols.forEach((col) => {
    doc.text(col.label, cx, y + 5);
    cx += col.w;
  });
  y += rowH;

  exercicios.forEach((e, idx) => {
    y = checkPage(doc, y, rowH + 2);

    if (idx % 2 === 0) {
      doc.setFillColor(245, 245, 252);
      doc.rect(MARGIN, y, CONTENT_W, rowH, "F");
    }

    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...BLACK);

    let rx = MARGIN + 2;
    const values = [
      formatarData(e.data_realizacao),
      doc.splitTextToSize(e.titulo, cols[1].w - 2)[0],
      e.nota !== null ? e.nota.toString() : "—",
    ];
    values.forEach((v, vi) => {
      doc.text(v, rx, y + 5);
      rx += cols[vi].w;
    });

    drawDivider(doc, y + rowH, [225, 225, 235]);
    y += rowH;
  });

  return y + 6;
}

// --- Tabela de participações ---
function drawParticipacaoTable(
  doc: jsPDF,
  presencas: AlunoBoletimDados["presencas"],
  lousas: AlunoBoletimDados["lousas"],
  y: number
): number {
  const totalItens = presencas.length + lousas.length;
  if (totalItens === 0) return y;
  y = checkPage(doc, y, 30);
  y = sectionTitle(doc, "Participações", y);

  const cols = [
    { label: "Data", w: 28 },
    { label: "Tipo", w: 36 },
    { label: "Detalhe", w: CONTENT_W - 28 - 36 },
  ];
  const rowH = 7;

  doc.setFillColor(...BRAND_COLOR);
  doc.rect(MARGIN, y, CONTENT_W, rowH, "F");
  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...WHITE);
  let cx = MARGIN + 2;
  cols.forEach((col) => {
    doc.text(col.label, cx, y + 5);
    cx += col.w;
  });
  y += rowH;

  const rows: Array<{ data: string; tipo: string; detalhe: string }> = [
    ...presencas.map((p) => ({
      data: formatarData(p.data_registro),
      tipo: "Aula ao Vivo",
      detalhe: p.duracao_minutos ? `${p.duracao_minutos} min` : "—",
    })),
    ...lousas.map((l) => ({
      data: formatarData(l.submitted_at),
      tipo: "Lousa",
      detalhe: l.nota !== null ? `Nota: ${l.nota}` : "—",
    })),
  ].sort((a, b) => a.data.localeCompare(b.data));

  rows.forEach((row, idx) => {
    y = checkPage(doc, y, rowH + 2);

    if (idx % 2 === 0) {
      doc.setFillColor(245, 245, 252);
      doc.rect(MARGIN, y, CONTENT_W, rowH, "F");
    }

    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...BLACK);

    let rx = MARGIN + 2;
    [row.data, row.tipo, row.detalhe].forEach((v, vi) => {
      doc.text(v, rx, y + 5);
      rx += cols[vi].w;
    });

    drawDivider(doc, y + rowH, [225, 225, 235]);
    y += rowH;
  });

  return y + 6;
}

// --- Rodapé ---
function drawFooter(doc: jsPDF) {
  const totalPages = (doc.internal as any).getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    addPageNumber(doc, i, totalPages);
    doc.setFontSize(7);
    doc.setTextColor(...GRAY);
    doc.text("Laboratório do Redator — gerado automaticamente", MARGIN, PAGE_H - 8);
  }
}

// --- Utilitário: hex → rgb ---
function hexToRgb(hex: string): [number, number, number] | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)]
    : null;
}

// --- Função principal exportada ---
export async function exportarBoletimPDF(
  dados: AlunoBoletimDados,
  mes: number,
  ano: number
) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });

  const logoBase64 = await loadImageAsBase64(
    "/lovable-uploads/680e47a8-eb97-4ceb-b36b-374cdf9f9c86.png"
  ).catch(() => undefined);

  let y = drawHeader(doc, dados.aluno, mes, ano, logoBase64);
  y = drawMetricCards(doc, dados.metricas, y);

  // Gráficos na primeira / segunda página
  y = drawEvolucaoChart(doc, dados.evolucaoNotas, y);
  y = drawCompetenciasChart(doc, dados.mediasPorCompetencia, y);
  y = drawEngajamentoChart(doc, dados.engajamento, y);

  // Tabelas
  y = drawRedacoesTable(doc, dados.redacoes, y);
  y = drawExerciciosTable(doc, dados.exercicios, y);
  y = drawParticipacaoTable(doc, dados.presencas, dados.lousas, y);

  drawFooter(doc);

  const nomeAluno = dados.aluno
    ? `${dados.aluno.nome}_${dados.aluno.sobrenome}`.replace(/\s+/g, "_")
    : "aluno";
  doc.save(`boletim_${nomeAluno}_${getNomeMes(mes)}_${ano}.pdf`);
}
