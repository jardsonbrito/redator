
/**
 * Utilitário para detecção de divergência e terceira correção de redações de simulado.
 *
 * Regras de discrepância (dois critérios independentes — basta um ser verdadeiro):
 *   • Critério A (total):       |nota_final_corretor_1 − nota_final_corretor_2| > 100
 *   • Critério B (competência): diferença em qualquer Cx > 80
 *
 * Importante:
 *   - 100 pts de diferença total é permitido; apenas ACIMA de 100 gera discrepância.
 *   - 80 pts em competência é permitido; apenas ACIMA de 80 gera discrepância.
 *   - A verificação só dispara quando AMBOS os corretores têm status = 'corrigida'.
 *     Salvar como 'incompleta' não aciona a verificação.
 *
 * Após discrepância, o admin realiza a terceira correção.
 * Nota final = média das duas notas totais mais próximas entre C1, C2 e Admin.
 * Regra de empate: preferência 1_2 > 1_admin > 2_admin
 *   (decisão deliberada de negócio: preservar os dois corretores originais em empate)
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

export interface RedacaoParaTerceira extends RedacaoParaVerificacao {
  c1_admin?: number | null;
  c2_admin?: number | null;
  c3_admin?: number | null;
  c4_admin?: number | null;
  c5_admin?: number | null;
  nota_final_admin?: number | null;
}

/**
 * Verifica divergência entre os dois corretores iniciais.
 *
 * Pré-condição obrigatória: ambos devem ter status = 'corrigida'.
 * Retorna null se a condição não for atendida (aguardando ou rascunho).
 */
export function verificarDivergencia(
  redacao: RedacaoParaVerificacao
): ResultadoDivergencia | null {
  // Trava: só verifica quando ambos finalizaram formalmente
  const ambosFinalizaram =
    redacao.status_corretor_1 === 'corrigida' &&
    redacao.status_corretor_2 === 'corrigida';

  const ambosTemNotas =
    !!redacao.corretor_id_1 &&
    !!redacao.corretor_id_2 &&
    redacao.nota_final_corretor_1 != null &&
    redacao.nota_final_corretor_2 != null;

  if (!ambosFinalizaram || !ambosTemNotas) return null;

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
      // Critério B: apenas ACIMA de 80 (não inclui exatamente 80)
      temDivergencia: diferenca > 80,
    };
  });

  // Critério A: apenas ACIMA de 100 (não inclui exatamente 100)
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
 * Determina qual par de notas totais é mais próximo entre os três avaliadores.
 *
 * Regra de empate (decisão deliberada de negócio):
 *   Prioridade 1_2 > 1_admin > 2_admin
 *   Em empate, os dois corretores originais prevalecem sobre o admin,
 *   pois o admin foi convocado como árbitro, não como avaliador padrão.
 */
export function calcularParMaisProximo(
  N1: number,
  N2: number,
  N3: number
): '1_2' | '1_admin' | '2_admin' {
  const diff_12   = Math.abs(N1 - N2);
  const diff_1adm = Math.abs(N1 - N3);
  const diff_2adm = Math.abs(N2 - N3);
  const menor = Math.min(diff_12, diff_1adm, diff_2adm);

  // Prioridade deliberada em empate: 1_2 > 1_admin > 2_admin
  if (diff_12   === menor) return '1_2';
  if (diff_1adm === menor) return '1_admin';
  return '2_admin';
}

/**
 * Calcula as notas finais por competência usando o par mais próximo.
 * Usado pelo admin ao finalizar após terceira correção.
 */
export function calcularNotasFinaisPorPar(
  redacao: RedacaoParaTerceira,
  par: '1_2' | '1_admin' | '2_admin'
): {
  nota_c1: number;
  nota_c2: number;
  nota_c3: number;
  nota_c4: number;
  nota_c5: number;
  nota_total: number;
} {
  const fontes = {
    '1_2':    { a: 'corretor_1', b: 'corretor_2' },
    '1_admin': { a: 'corretor_1', b: 'admin'     },
    '2_admin': { a: 'corretor_2', b: 'admin'     },
  } as const;

  const { a, b } = fontes[par];

  const media = (i: number) => {
    const vA = (redacao as any)[`c${i}_${a}`] ?? 0;
    const vB = (redacao as any)[`c${i}_${b}`] ?? 0;
    return Math.round((vA + vB) / 2);
  };

  const nota_c1 = media(1);
  const nota_c2 = media(2);
  const nota_c3 = media(3);
  const nota_c4 = media(4);
  const nota_c5 = media(5);

  return {
    nota_c1,
    nota_c2,
    nota_c3,
    nota_c4,
    nota_c5,
    nota_total: nota_c1 + nota_c2 + nota_c3 + nota_c4 + nota_c5,
  };
}

/**
 * Calcula as notas finais como média dos dois corretores originais (por competência).
 * Usado pelo admin ao finalizar no caminho sem discrepância (Opção A aprovada).
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
