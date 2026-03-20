import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { startOfMonth, endOfMonth, format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toZonedTime } from "date-fns-tz";

const TZ = "America/Fortaleza";

export interface RedacaoBoletim {
  id: string;
  tema: string;
  tipo: "regular" | "simulado" | "exercicio";
  data_envio: string;
  nota_total: number | null;
  nota_c1: number | null;
  nota_c2: number | null;
  nota_c3: number | null;
  nota_c4: number | null;
  nota_c5: number | null;
}

export interface ExercicioBoletim {
  id: string;
  titulo: string;
  data_realizacao: string;
  nota: number | null;
}

export interface PresencaBoletim {
  id: string;
  aula_id: string;
  data_registro: string;
  duracao_minutos: number | null;
}

export interface LousaBoletim {
  id: string;
  lousa_id: string;
  submitted_at: string;
  nota: number | null;
}

export interface EventoBoletim {
  data_hora: string;
  feature: string;
  action: string;
  tipo_label: string;
  acao_label: string;
}

export interface MetricasBoletim {
  totalRedacoes: number;
  mediaGeral: number | null;
  totalExercicios: number;
  totalPresencas: number;
  totalLousas: number;
  totalAulasNoPeriodo: number;
  taxaFrequencia: number | null;
  creditos: number | null;
  mediaPorTipo: {
    regular: number | null;
    simulado: number | null;
  };
  totalRepertorio: number;
  repertorioDetalhe: {
    paragrafos: number;
    frases: number;
    obras: number;
  };
  totalGuiasConcluidos: number;
}

export interface EvolucaoNota {
  label: string;
  data: string;
  nota: number;
  tipo: "regular" | "simulado" | "exercicio";
}

export interface MediaCompetencia {
  nome: string;
  chave: string;
  media: number;
  cor: string;
}

export interface DadoEngajamento {
  tipo: string;
  total: number;
  cor: string;
}

export interface AlunoBoletimDados {
  aluno: {
    nome: string;
    sobrenome: string;
    email: string;
    turma: string | null;
    creditos: number | null;
    data_aprovacao: string | null;
  } | null;
  redacoes: RedacaoBoletim[];
  exercicios: ExercicioBoletim[];
  presencas: PresencaBoletim[];
  lousas: LousaBoletim[];
  eventos: EventoBoletim[];
  metricas: MetricasBoletim;
  evolucaoNotas: EvolucaoNota[];
  mediasPorCompetencia: MediaCompetencia[];
  engajamento: DadoEngajamento[];
}

function calcularMedia(valores: (number | null)[]): number | null {
  const validos = valores.filter((v): v is number => v !== null && !isNaN(v));
  if (validos.length === 0) return null;
  return Math.round((validos.reduce((acc, v) => acc + v, 0) / validos.length) * 10) / 10;
}

const FEATURE_LABEL: Record<string, string> = {
  essay_regular: "Redação (Regular)",
  essay_simulado: "Redação (Simulado)",
  lousa: "Lousa",
  live: "Aula ao Vivo",
  gravada: "Aula Gravada",
};

const ACTION_LABEL: Record<string, string> = {
  submitted: "Enviado",
  opened: "Aberta",
  completed: "Concluída",
  participated: "Participei",
  not_participated: "Não participei",
  watched: "Assistiu",
};

async function fetchBoletimData(
  email: string,
  turma: string,
  mes: number,
  ano: number
): Promise<AlunoBoletimDados> {
  const baseDate = toZonedTime(new Date(ano, mes - 1, 1), TZ);
  const monthStart = startOfMonth(baseDate).toISOString();
  const monthEnd = endOfMonth(baseDate).toISOString();
  const dateStart = monthStart.split("T")[0];
  const dateEnd = monthEnd.split("T")[0];

  const [
    perfilRes,
    redacoesRegRes,
    redacoesSimRes,
    redacoesExeRes,
    exerciciosRes,
    presencasRes,
    aulasRes,
    lousasRes,
    eventosRes,
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, nome, sobrenome, email, turma, creditos, data_aprovacao")
      .eq("email", email)
      .single(),

    supabase
      .from("redacoes_enviadas")
      .select("id, frase_tematica, data_envio, nota_total, nota_c1, nota_c2, nota_c3, nota_c4, nota_c5")
      .eq("email_aluno", email)
      .eq("corrigida", true)
      .gte("data_envio", monthStart)
      .lte("data_envio", monthEnd),

    supabase
      .from("redacoes_simulado")
      .select("id, data_envio, nota_total, nota_c1, nota_c2, nota_c3, nota_c4, nota_c5")
      .eq("email_aluno", email)
      .eq("corrigida", true)
      .gte("data_envio", monthStart)
      .lte("data_envio", monthEnd),

    supabase
      .from("redacoes_exercicio")
      .select("id, data_envio, nota_total, nota_c1, nota_c2, nota_c3, nota_c4, nota_c5")
      .eq("email_aluno", email)
      .eq("corrigida", true)
      .gte("data_envio", monthStart)
      .lte("data_envio", monthEnd),

    supabase
      .from("radar_dados")
      .select("id, titulo_exercicio, data_realizacao, nota")
      .eq("email_aluno", email)
      .gte("data_realizacao", dateStart)
      .lte("data_realizacao", dateEnd),

    supabase
      .from("presenca_aulas")
      .select("id, aula_id, data_registro, duracao_minutos, entrada_at")
      .eq("email_aluno", email)
      .not("entrada_at", "is", null)
      .gte("entrada_at", monthStart)
      .lte("entrada_at", monthEnd),

    supabase
      .from("aulas_virtuais")
      .select("id, data_aula, aula_mae_id")
      .contains("turmas_autorizadas", [turma])
      .gte("data_aula", dateStart)
      .lte("data_aula", dateEnd),

    supabase
      .from("lousa_resposta")
      .select("id, lousa_id, submitted_at, nota, created_at")
      .eq("email_aluno", email)
      .or(
        `and(submitted_at.gte.${monthStart},submitted_at.lte.${monthEnd}),` +
        `and(submitted_at.is.null,created_at.gte.${monthStart},created_at.lte.${monthEnd})`
      ),

    supabase
      .from("student_feature_event")
      .select("occurred_at, feature, action, entity_id, metadata")
      .eq("student_email", email)
      .eq("month", mes)
      .eq("year", ano)
      .order("occurred_at", { ascending: false }),
  ]);

  const autorId: string | null = (perfilRes.data as any)?.id ?? null;

  const guiasConcluídosRes = await (supabase as any)
    .from('guias_tematicos_conclusoes')
    .select('guia_id')
    .eq('aluno_email', email)
    .gte('concluded_at', monthStart)
    .lte('concluded_at', monthEnd);

  const [repParagrafosRes, repFrasesRes, repObrasRes] = await Promise.all([
    autorId
      ? supabase
          .from("repertorio_publicacoes")
          .select("id", { count: "exact", head: true })
          .eq("autor_id", autorId)
          .gte("created_at", monthStart)
          .lte("created_at", monthEnd)
      : Promise.resolve({ count: 0, error: null }),

    autorId
      ? supabase
          .from("repertorio_frases")
          .select("id", { count: "exact", head: true })
          .eq("autor_id", autorId)
          .gte("created_at", monthStart)
          .lte("created_at", monthEnd)
      : Promise.resolve({ count: 0, error: null }),

    autorId
      ? supabase
          .from("repertorio_obras")
          .select("id", { count: "exact", head: true })
          .eq("autor_id", autorId)
          .gte("created_at", monthStart)
          .lte("created_at", monthEnd)
      : Promise.resolve({ count: 0, error: null }),
  ]);

  // --- Montar arrays de redações ---
  const redacoesRegulares: RedacaoBoletim[] = (redacoesRegRes.data || []).map((r) => ({
    id: r.id,
    tema: r.frase_tematica || "—",
    tipo: "regular",
    data_envio: r.data_envio,
    nota_total: r.nota_total,
    nota_c1: r.nota_c1,
    nota_c2: r.nota_c2,
    nota_c3: r.nota_c3,
    nota_c4: r.nota_c4,
    nota_c5: r.nota_c5,
  }));

  const redacoesSimulado: RedacaoBoletim[] = (redacoesSimRes.data || []).map((r) => ({
    id: r.id,
    tema: "Simulado",
    tipo: "simulado",
    data_envio: r.data_envio,
    nota_total: r.nota_total,
    nota_c1: r.nota_c1,
    nota_c2: r.nota_c2,
    nota_c3: r.nota_c3,
    nota_c4: r.nota_c4,
    nota_c5: r.nota_c5,
  }));

  const redacoesExercicio: RedacaoBoletim[] = (redacoesExeRes.data || []).map((r) => ({
    id: r.id,
    tema: "Exercício",
    tipo: "exercicio",
    data_envio: r.data_envio || "",
    nota_total: r.nota_total,
    nota_c1: r.nota_c1,
    nota_c2: r.nota_c2,
    nota_c3: r.nota_c3,
    nota_c4: r.nota_c4,
    nota_c5: r.nota_c5,
  }));

  const todasRedacoes = [...redacoesRegulares, ...redacoesSimulado, ...redacoesExercicio].sort(
    (a, b) => a.data_envio.localeCompare(b.data_envio)
  );

  const exercicios: ExercicioBoletim[] = (exerciciosRes.data || []).map((e) => ({
    id: e.id,
    titulo: e.titulo_exercicio,
    data_realizacao: e.data_realizacao,
    nota: e.nota,
  }));

  // Presenças DISTINCT por aula_id
  const presencasMap = new Map<string, typeof presencasRes.data extends (infer T)[] | null ? T : never>();
  (presencasRes.data || []).forEach((p) => {
    if (!presencasMap.has(p.aula_id)) presencasMap.set(p.aula_id, p);
  });
  const presencas: PresencaBoletim[] = Array.from(presencasMap.values()).map((p) => ({
    id: p.id,
    aula_id: p.aula_id,
    data_registro: p.data_registro,
    duracao_minutos: p.duracao_minutos,
  }));

  // Lousas DISTINCT por lousa_id
  const lousasMap = new Map<string, typeof lousasRes.data extends (infer T)[] | null ? T : never>();
  (lousasRes.data || []).forEach((l) => {
    if (!lousasMap.has(l.lousa_id)) lousasMap.set(l.lousa_id, l);
  });
  const lousas: LousaBoletim[] = Array.from(lousasMap.values()).map((l) => ({
    id: l.id,
    lousa_id: l.lousa_id,
    submitted_at: (l.submitted_at ?? (l as any).created_at)!,
    nota: l.nota,
  }));

  const eventos: EventoBoletim[] = (eventosRes.data || []).map((e) => ({
    data_hora: new Date(e.occurred_at).toLocaleString("pt-BR", {
      timeZone: TZ,
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }),
    feature: e.feature,
    action: e.action,
    tipo_label: FEATURE_LABEL[e.feature] || e.feature,
    acao_label: ACTION_LABEL[e.action] || e.action,
  }));

  // --- Métricas ---
  // Agrupar aulas virtuais por unidade pedagógica:
  // repetições (aula_mae_id != null) se juntam ao grupo da aula mãe
  const rawAulasList = (aulasRes.data || []) as { id: string; aula_mae_id: string | null }[];
  const gruposAulas: Record<string, string[]> = {};
  for (const a of rawAulasList.filter(a => !a.aula_mae_id)) {
    gruposAulas[a.id] = [a.id];
  }
  for (const a of rawAulasList.filter(a => !!a.aula_mae_id)) {
    if (gruposAulas[a.aula_mae_id!]) {
      gruposAulas[a.aula_mae_id!].push(a.id);
    } else {
      // Aula mãe fora do período — tratar como unidade independente
      gruposAulas[a.id] = [a.id];
    }
  }
  const totalAulasNoPeriodo = Object.keys(gruposAulas).length;

  // Presença por unidade pedagógica: basta ter entrada em qualquer sessão do grupo
  const idsComPresenca = new Set(presencas.map(p => p.aula_id));
  const totalPresencas = Object.values(gruposAulas).filter(ids =>
    ids.some(id => idsComPresenca.has(id))
  ).length;

  const taxaFrequencia =
    totalAulasNoPeriodo > 0
      ? Math.round((totalPresencas / totalAulasNoPeriodo) * 1000) / 10
      : null;

  const mediaGeral = calcularMedia(todasRedacoes.map((r) => r.nota_total));
  const mediaPorTipo = {
    regular: calcularMedia(redacoesRegulares.map((r) => r.nota_total)),
    simulado: calcularMedia(redacoesSimulado.map((r) => r.nota_total)),
  };

  const repertorioDetalhe = {
    paragrafos: repParagrafosRes.count ?? 0,
    frases: repFrasesRes.count ?? 0,
    obras: repObrasRes.count ?? 0,
  };

  const metricas: MetricasBoletim = {
    totalRedacoes: todasRedacoes.length,
    mediaGeral,
    totalExercicios: exercicios.length,
    totalPresencas,
    totalLousas: lousas.length,
    totalAulasNoPeriodo,
    taxaFrequencia,
    creditos: perfilRes.data?.creditos ?? null,
    mediaPorTipo,
    totalRepertorio: repertorioDetalhe.paragrafos + repertorioDetalhe.frases + repertorioDetalhe.obras,
    repertorioDetalhe,
    totalGuiasConcluidos: new Set((guiasConcluídosRes.data || []).map((r: any) => r.guia_id)).size,
  };

  // --- Evolução de notas (redações com nota, ordenadas por data) ---
  const evolucaoNotas: EvolucaoNota[] = todasRedacoes
    .filter((r) => r.nota_total !== null && r.data_envio)
    .map((r) => ({
      label: format(parseISO(r.data_envio), "dd/MM", { locale: ptBR }),
      data: r.data_envio,
      nota: r.nota_total!,
      tipo: r.tipo,
    }));

  // --- Médias por competência ---
  const competencias = [
    { chave: "nota_c1", nome: "C1", cor: "#6366f1" },
    { chave: "nota_c2", nome: "C2", cor: "#8b5cf6" },
    { chave: "nota_c3", nome: "C3", cor: "#a855f7" },
    { chave: "nota_c4", nome: "C4", cor: "#d946ef" },
    { chave: "nota_c5", nome: "C5", cor: "#ec4899" },
  ];

  const mediasPorCompetencia: MediaCompetencia[] = competencias.map((c) => ({
    ...c,
    media:
      calcularMedia(
        todasRedacoes.map((r) => r[c.chave as keyof RedacaoBoletim] as number | null)
      ) ?? 0,
  }));

  // --- Dados de engajamento ---
  const engajamento: DadoEngajamento[] = [
    { tipo: "Redações", total: todasRedacoes.length, cor: "#6366f1" },
    { tipo: "Exercícios", total: exercicios.length, cor: "#8b5cf6" },
    { tipo: "Aulas ao Vivo", total: totalPresencas, cor: "#f59e0b" },
    { tipo: "Lousas", total: lousas.length, cor: "#10b981" },
    { tipo: "Repertório", total: metricas.totalRepertorio, cor: "#f97316" },
  ];

  return {
    aluno: perfilRes.data
      ? {
          nome: perfilRes.data.nome,
          sobrenome: perfilRes.data.sobrenome,
          email: perfilRes.data.email,
          turma: perfilRes.data.turma,
          creditos: perfilRes.data.creditos,
          data_aprovacao: perfilRes.data.data_aprovacao,
        }
      : null,
    redacoes: todasRedacoes,
    exercicios,
    presencas,
    lousas,
    eventos,
    metricas,
    evolucaoNotas,
    mediasPorCompetencia,
    engajamento,
  };
}

export function useAlunoBoletim(
  email: string | null,
  turma: string | null,
  mes: number,
  ano: number
) {
  return useQuery({
    queryKey: ["alunoBoletim", email, turma, mes, ano],
    queryFn: () => fetchBoletimData(email!, turma!, mes, ano),
    enabled: !!email && !!turma,
    staleTime: 5 * 60 * 1000,
  });
}
