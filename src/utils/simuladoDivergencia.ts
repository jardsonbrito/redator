
/**
 * Utilitário para detecção de divergência entre corretores de redações de simulado.
 *
 * Regras:
 * - Divergência total: diferença entre nota_final_corretor_1 e nota_final_corretor_2 > 100 pts
 * - Divergência por competência: diferença em qualquer Cx > 80 pts
 */

export interface DivergenciaCompetencia {
  competencia: number; // 1 a 5
  nota_c1: number;
  nota_c2: number;
  diferenca: number;
  temDivergencia: boolean;
}

export interface ResultadoDivergencia {
  temDivergencia: boolean;
  nota_final_1: number;
  nota_final_2: number;
  diferencaTotal: number;
  competencias: DivergenciaCompetencia[];
}

export interface RedacaoParaVerificacao {
  status_corretor_1?: string | null;
  status_corretor_2?: string | null;
  corretor_id_1?: string | null;
  corretor_id_2?: string | null;
  nota_final_corretor_1?: number | null;
  nota_final_corretor_2?: number | null;
  c1_corretor_1?: number | null;
  c1_corretor_2?: number | null;
  c2_corretor_1?: number | null;
  c2_corretor_2?: number | null;
  c3_corretor_1?: number | null;
  c3_corretor_2?: number | null;
  c4_corretor_1?: number | null;
  c4_corretor_2?: number | null;
  c5_corretor_1?: number | null;
  c5_corretor_2?: number | null;
}

/**
 * Retorna null se ainda não há notas dos dois corretores.
 * Retorna ResultadoDivergencia assim que ambos tiverem notas registradas,
 * independentemente de o status ser 'incompleta' ou 'corrigida'.
 */
export function verificarDivergencia(
  redacao: RedacaoParaVerificacao
): ResultadoDivergencia | null {
  const ambosTemNotas =
    !!redacao.corretor_id_1 &&
    !!redacao.corretor_id_2 &&
    redacao.nota_final_corretor_1 != null &&
    redacao.nota_final_corretor_2 != null;

  if (!ambosTemNotas) return null;

  const nota1 = redacao.nota_final_corretor_1 ?? 0;
  const nota2 = redacao.nota_final_corretor_2 ?? 0;
  const diferencaTotal = Math.abs(nota1 - nota2);

  const competencias: DivergenciaCompetencia[] = [1, 2, 3, 4, 5].map((i) => {
    const n1 = (redacao as any)[`c${i}_corretor_1`] ?? 0;
    const n2 = (redacao as any)[`c${i}_corretor_2`] ?? 0;
    const diferenca = Math.abs(n1 - n2);
    return {
      competencia: i,
      nota_c1: n1,
      nota_c2: n2,
      diferenca,
      temDivergencia: diferenca > 80,
    };
  });

  const temDivergencia =
    diferencaTotal > 100 || competencias.some((c) => c.temDivergencia);

  return {
    temDivergencia,
    nota_final_1: nota1,
    nota_final_2: nota2,
    diferencaTotal,
    competencias,
  };
}

/**
 * Calcula as notas finais como média dos dois corretores (por competência).
 * Usado pelo admin ao finalizar sem divergência.
 */
export function calcularNotasFinais(redacao: RedacaoParaVerificacao): {
  nota_c1: number;
  nota_c2: number;
  nota_c3: number;
  nota_c4: number;
  nota_c5: number;
  nota_total: number;
} {
  const media = (a: number | null | undefined, b: number | null | undefined) =>
    Math.round(((a ?? 0) + (b ?? 0)) / 2);

  const nota_c1 = media(redacao.c1_corretor_1, redacao.c1_corretor_2);
  const nota_c2 = media(redacao.c2_corretor_1, redacao.c2_corretor_2);
  const nota_c3 = media(redacao.c3_corretor_1, redacao.c3_corretor_2);
  const nota_c4 = media(redacao.c4_corretor_1, redacao.c4_corretor_2);
  const nota_c5 = media(redacao.c5_corretor_1, redacao.c5_corretor_2);
  const nota_total = nota_c1 + nota_c2 + nota_c3 + nota_c4 + nota_c5;

  return { nota_c1, nota_c2, nota_c3, nota_c4, nota_c5, nota_total };
}
