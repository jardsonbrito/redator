import { useQuery, useMutation, useQueryClient, useIsMutating } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useEffect, useRef } from 'react';

// ─── Tipos ────────────────────────────────────────────────────────────────────

export interface PEPTaxonomiaErro {
  id: string;
  codigo: string;
  nome: string;
  descricao: string;
  eixo: string;
}

export interface PEPRecurso {
  id: string;
  tipo: string;
  recurso_id: string | null;
  titulo: string;
  descricao: string | null;
  url_direta: string | null;
  tags_erros: string[];
}

export interface PEPTask {
  id: string;
  aluno_email: string;
  erro_id: string | null;
  recurso_id: string | null;
  titulo: string;
  motivo: string;
  acao: string;
  criterio_conclusao: string;
  status: 'ativa' | 'concluida' | 'bloqueada' | 'cancelada';
  ordem: number;
  gerada_por: string;
  gerada_em: string;
  ativada_em: string | null;
  concluida_em: string | null;
  // joins
  erro?: PEPTaxonomiaErro | null;
  recurso?: PEPRecurso | null;
}

// ─── Constantes pedagógicas ───────────────────────────────────────────────────

/**
 * Para cada competência, o código do erro primário mais representativo no banco.
 * A detecção NÃO usa threshold fixo — é relativa por redação (ver bootstrap).
 *
 * Definições ENEM:
 *  C1 — Domínio da norma-padrão (gramática, ortografia, pontuação, vocabulário formal)
 *  C2 — Compreensão do tema, uso de repertório sociocultural e estrutura dissertativa
 *  C3 — Organização das ideias e argumentação (defesa do ponto de vista, lógica, progressão)
 *  C4 — Mecanismos linguísticos de coesão (conectivos, coesão referencial e sequencial)
 *  C5 — Proposta de intervenção social detalhada e respeitosa aos direitos humanos
 */
const COMPETENCIAS: Array<{ campo: string; codigo: string }> = [
  { campo: 'nota_c1', codigo: 'C1_CONCORDANCIA' },
  { campo: 'nota_c2', codigo: 'C2_REPERTORIO'   },
  { campo: 'nota_c3', codigo: 'C3_PROGRESSAO'   }, // C3_PROGRESSAO representa melhor a competência toda
  { campo: 'nota_c4', codigo: 'C4_COESAO_SEQ'   }, // C4_COESAO_SEQ cobre mecanismos de coesão como um todo
  { campo: 'nota_c5', codigo: 'C5_PROPOSTA'     },
];

/**
 * Nome de exibição da tarefa — reflete a competência completa, não um sub-erro isolado.
 * Todos os códigos da taxonomia são mapeados para o nome da competência-mãe.
 */
const ERRO_NOME: Record<string, string> = {
  // C1 — Norma-padrão (qualquer sub-erro gera a mesma missão de competência)
  C1_CONCORDANCIA: 'Norma-padrão da língua portuguesa',
  C1_REGENCIA:     'Norma-padrão da língua portuguesa',
  C1_PONTUACAO:    'Norma-padrão da língua portuguesa',
  C1_ORTOGRAFIA:   'Norma-padrão da língua portuguesa',
  C1_PARAGRAFACAO: 'Norma-padrão da língua portuguesa',
  // C2 — Tema e repertório
  C2_TEMA:         'Compreensão do tema e repertório sociocultural',
  C2_REPERTORIO:   'Compreensão do tema e repertório sociocultural',
  C2_PERTINENCIA:  'Compreensão do tema e repertório sociocultural',
  // C3 — Organização e argumentação
  C3_TESE:         'Organização e desenvolvimento argumentativo',
  C3_PROGRESSAO:   'Organização e desenvolvimento argumentativo',
  C3_CONTRA_ARG:   'Organização e desenvolvimento argumentativo',
  // C4 — Coesão e mecanismos linguísticos
  C4_COESAO_REF:   'Coesão e mecanismos linguísticos',
  C4_CONECTIVOS:   'Coesão e mecanismos linguísticos',
  C4_COESAO_SEQ:   'Coesão e mecanismos linguísticos',
  // C5 — Proposta de intervenção
  C5_PROPOSTA:     'Proposta de intervenção',
  C5_DETALHAMENTO: 'Proposta de intervenção',
  C5_RESPEITO_DH:  'Proposta de intervenção',
};

/** Rótulo curto do eixo para uso no motivo template */
const EIXO_NOME: Record<string, string> = {
  C1: 'Competência 1 — norma-padrão',
  C2: 'Competência 2 — tema e repertório',
  C3: 'Competência 3 — organização e argumentação',
  C4: 'Competência 4 — coesão textual',
  C5: 'Competência 5 — proposta de intervenção',
};

/**
 * Descrição pedagógica do que cada competência avalia —
 * usada no template do motivo quando não há comentário do corretor disponível.
 */
const DESCRICAO_COMPETENCIA: Record<string, string> = {
  C1: 'escrever em conformidade com a norma-padrão: gramática, ortografia, pontuação e vocabulário formal',
  C2: 'compreender o tema e usar repertório sociocultural pertinente em texto dissertativo-argumentativo',
  C3: 'organizar as ideias e construir argumentos de forma lógica, coerente e bem estruturada',
  C4: 'articular o texto com mecanismos de coesão entre frases, períodos e parágrafos',
  C5: 'elaborar uma proposta de intervenção social detalhada e respeitosa aos direitos humanos',
};

// ─── Core: bootstrap retroativo ───────────────────────────────────────────────

/**
 * Lê o histórico de redações já corrigidas e gera automaticamente
 * o plano (consolidação + top 3 tasks) para o aluno.
 * Só executa se o aluno não tiver nenhuma task ainda.
 */
async function bootstrapPlanoFromHistorico(email: string): Promise<boolean> {
  const emailNorm = email.toLowerCase().trim();

  // 1. Buscar a taxonomia para obter os IDs reais dos erros
  const { data: taxonomia } = await supabase
    .from('pep_taxonomia_erros')
    .select('id, codigo, nome, eixo')
    .eq('ativo', true);

  if (!taxonomia || taxonomia.length === 0) return false;

  const taxonomiaMap = new Map<string, PEPTaxonomiaErro>(
    taxonomia.map(t => [t.codigo, t as PEPTaxonomiaErro])
  );

  // 2. Buscar todas as fontes de diagnóstico em paralelo (últimos 6 meses)
  const seisMesesAtras = new Date();
  seisMesesAtras.setMonth(seisMesesAtras.getMonth() - 6);
  const desde = seisMesesAtras.toISOString();

  const [
    { data: marcacoes },
    { data: redacoes },
    { data: simulados },
    { data: exercicios },
    { data: lousas },
    { data: quizErros },
  ] = await Promise.all([
    // 0. Marcações estruturadas do corretor — FONTE PRINCIPAL (peso 2.0 por marcação)
    supabase
      .from('pep_marcacoes_corretor')
      .select('competencia, aspecto_id, created_at, aspecto:aspecto_id(nome)')
      .ilike('aluno_email', emailNorm)
      .gte('created_at', desde)
      .order('created_at', { ascending: false }),

    // 1. Redações tema livre — notas C1-C5 + comentários do corretor (fonte primária)
    supabase
      .from('redacoes_enviadas')
      .select('nota_c1, nota_c2, nota_c3, nota_c4, nota_c5, data_correcao, id, elogios_pontos_atencao_corretor_1')
      .ilike('email_aluno', emailNorm)
      .not('nota_total', 'is', null)
      .gte('data_correcao', desde)
      .is('deleted_at', null)
      .order('data_correcao', { ascending: false })
      .limit(30),

    // 2. Redações de simulado — notas C1-C5 + comentários do corretor (fonte primária)
    supabase
      .from('redacoes_simulado')
      .select('nota_c1, nota_c2, nota_c3, nota_c4, nota_c5, data_correcao, id, elogios_pontos_atencao_corretor_1')
      .ilike('email_aluno', emailNorm)
      .not('nota_total', 'is', null)
      .gte('data_correcao', desde)
      .is('deleted_at', null)
      .order('data_correcao', { ascending: false })
      .limit(20),

    // 3. Redações de exercício — mesma estrutura C1-C5 (fonte primária, estava ignorada)
    supabase
      .from('redacoes_exercicio')
      .select('nota_c1, nota_c2, nota_c3, nota_c4, nota_c5, data_correcao, id')
      .ilike('email_aluno', emailNorm)
      .not('nota_total', 'is', null)
      .gte('data_correcao', desde)
      .is('deleted_at', null)
      .order('data_correcao', { ascending: false })
      .limit(20),

    // 4. Lousas corrigidas — nota 0-10, título identifica a competência (fonte secundária)
    supabase
      .from('lousa_resposta')
      .select('nota, submitted_at, lousa_id, lousa:lousa_id(titulo)')
      .ilike('email_aluno', emailNorm)
      .not('nota', 'is', null)
      .gte('submitted_at', desde)
      .order('submitted_at', { ascending: false })
      .limit(30),

    // 5. Erros em quizzes de microaprendizagem — acertou=false, título do tópico identifica competência
    supabase
      .from('micro_quiz_tentativas')
      .select(`
        acertou,
        created_at,
        questao:questao_id(
          item:item_id(
            topico:topico_id(titulo)
          )
        )
      `)
      .ilike('email_aluno', emailNorm)
      .eq('acertou', false)
      .gte('created_at', desde)
      .order('created_at', { ascending: false })
      .limit(50),
  ]);

  // Todas as fontes primárias (têm notas C1-C5 estruturadas)
  const todasRedacoes = [
    ...(redacoes ?? []),
    ...(simulados ?? []),
    ...(exercicios ?? []),
  ];

  const totalFontesSecundarias = (lousas ?? []).length + (quizErros ?? []).length + (marcacoes ?? []).length;

  // Sem nenhum dado histórico disponível: plano não pode ser gerado
  if (todasRedacoes.length === 0 && totalFontesSecundarias === 0) return false;

  // ─── Inferência de competência pelo título da lousa ───────────────────────
  // O título das lousas indica diretamente a competência trabalhada.
  // Exemplos reais: "Competência 1", "Competência 2 (aspecto 1)",
  // "Paralelismo Sintático" (C1), "Reconhecimento dos 3 momentos da Introdução" (C3)

  function inferirEixoDaLousa(titulo: string): string | null {
    // Referência direta: "competência X", "competencia X" ou "C X"
    const matchDireto = titulo.match(/compet[eê]ncia\s+([1-5])/i);
    if (matchDireto) return `C${matchDireto[1]}`;

    // C1 — Domínio da norma-padrão: gramática, ortografia, pontuação, vocabulário formal
    if (/ponto|vírgula|pontua|concord|regência|regencia|sintax|paralel|ortogr|acentu|gramát|gramat|norma.?padr|norma culta|vocabulário|vocabulario|léxico|lexico|registro formal|reescrit/i.test(titulo)) return 'C1';

    // C2 — Compreensão do tema, repertório sociocultural, estrutura dissertativa
    if (/repertório|repertorio|tema|sociocult|contextuali|frase temát|frase temat|dissertat|introdução|introducao|tese\s+da|delimitação|recorte/i.test(titulo)) return 'C2';

    // C3 — Organização das ideias e argumentação (defesa do ponto de vista, progressão, desenvolvimento lógico)
    if (/argum|organiz|progressão|progressao|desenvolvi|paragraf|estrutura do text|ponto de vista|defesa|lógic|logic|tópico fras|topico fras|causa.?efeito|contra.?arg/i.test(titulo)) return 'C3';

    // C4 — Mecanismos linguísticos de coesão (conectivos, coesão referencial e sequencial)
    if (/coes|conect|articulac|articulaç|referenc|pronome|anáfor|anafor|elipse|substituição|substituicao|sequenc|ligação|ligacao|fluidez/i.test(titulo)) return 'C4';

    // C5 — Proposta de intervenção
    if (/proposta|interven|conclus|agente|finalidade|efeito|direitos humanos|viabilidade/i.test(titulo)) return 'C5';

    return null;
  }

  // ─── Mapa de erro por eixo (para lousas) ─────────────────────────────────
  const ERRO_POR_EIXO: Record<string, string> = {
    C1: 'C1_CONCORDANCIA',
    C2: 'C2_REPERTORIO',
    C3: 'C3_TESE',
    C4: 'C4_CONECTIVOS',
    C5: 'C5_PROPOSTA',
  };

  // ─── Extração de sinais dos comentários dos corretores ───────────────────
  //
  // Os corretores usam o campo elogios_pontos_atencao_corretor_1 com seções
  // explícitas "Competência X – ..." que permitem extrair feedback por eixo.
  // Peso 0.4 por detecção (entre lousas 0.5 e quizzes 0.3).

  interface SinalComentario { eixo: string; trecho: string }

  // Mapa romano → número (V antes de IV, III antes de II antes de I para match correto)
  const ROMAN_TO_NUM: Record<string, string> = { 'V': '5', 'IV': '4', 'III': '3', 'II': '2', 'I': '1' };

  function extrairSignaisDeComentario(texto: string): SinalComentario[] {
    if (!texto || texto.length < 30) return [];
    const sinais: SinalComentario[] = [];

    // Os corretores usam tanto números arábicos (1-5) quanto romanos (I-V).
    // Exemplos reais: "COMPETÊNCIA I\n", "Competência I – Domínio", "Competência 1 – ..."
    // String.split com grupo de captura inclui os grupos no resultado:
    // ["prefixo", "I", "conteudo_c1", "II", "conteudo_c2", ...]
    const partes = texto.split(/[Cc]ompet[eê]ncia\s+([1-5]|V|IV|III|II|I)\s*[–\-—:]?/i);

    for (let i = 1; i < partes.length; i += 2) {
      const capturado = partes[i]?.trim().toUpperCase();
      if (!capturado) continue;

      // Converte romano → número ou usa arábico direto
      const num = ROMAN_TO_NUM[capturado] ?? (/^[1-5]$/.test(capturado) ? capturado : null);
      if (!num) continue;

      const conteudo = partes[i + 1] ?? '';
      if (!conteudo.trim()) continue;

      // Só extrai se há indicação CLARA de problema — evita falsos positivos em seções com
      // feedback misto (ex.: C5 "proposta completa, sugiro atenção à escolha lexical")
      const eNegativo = /Correção sugerida|Comentário pedagógico|incorret|inadequ|imprecis[ãao]|→\s*(não|parcial)|insuficiente|fragi|não\s+(apresenta|há|possui|tem\s+)|ausência\s+de/i.test(conteudo);
      if (!eNegativo) continue;

      // Extrai linhas mais informativas (ignora cabeçalhos e blocos de reescrita)
      const linhas = conteudo.split('\n')
        .map(l => l.replace(/^[\s•·●◦▪►\-\d.\to]+/, '').trim())
        .filter(l => l.length > 25 && l.length < 220)
        .filter(l => !/^(Sugestão de reescrita|REDAÇÃO LAPIDADA|Trecho|Parágrafo\s+\d|Competência|Verificação|Correção sugerida)/i.test(l))
        // Exclui linhas explicitamente positivas que surgem no início de seções
        .filter(l => !/^(A proposta é|O repertório|O texto está|Bem elaborad|Parabéns|Ótim|Excelen|Todos os elementos|Está (correto|completo|boa))/i.test(l));

      // Prefere linhas com comentário pedagógico ou descrição explícita de erro
      const linhasRicas = linhas.filter(l =>
        /Comentário pedagógico|incorret|inadequ|imprecis|semanticam|concordância|regência|coesão|argum|tese|organiz|progressão|progressao|lógic|ponto de vista|defesa|→\s*(não|parcial)|insuficiente|fragi/i.test(l)
      );

      const melhores = (linhasRicas.length > 0 ? linhasRicas : linhas).slice(0, 2);
      // Só gera trecho se as linhas têm conteúdo negativo real
      const trechoRaw = melhores.join(' ').replace(/\s+/g, ' ').trim().substring(0, 280);
      // O trecho final deve conter linguagem negativa explícita — descarta trechos positivos
      const trechoTemProblema = /incorret|inadequ|imprecis|erro\s|fragi|insuficiente|→\s*(não|parcial)|problem|deve\s+ser\s+revisad|ausência|falta\s+de/i.test(trechoRaw);
      // Descarta se o trecho pertence na verdade a outra competência (dica cross-C no texto)
      const outrasComps = [1, 2, 3, 4, 5].filter(n => n !== +num);
      const mencionaOutraComp = new RegExp(`(nota em C|reduz[ir]+\\s+nota\\s+em\\s+C)(${outrasComps.join('|')})`, 'i').test(trechoRaw);
      const trecho = (trechoTemProblema && !mencionaOutraComp) ? trechoRaw : '';

      if (trecho) sinais.push({ eixo: `C${num}`, trecho });
    }

    return sinais;
  }

  // Coleta de trechos por eixo (melhor trecho = mais longo/mais detalhado)
  const trechosComentario = new Map<string, string>(); // eixo → trecho

  const comentariosParaAnalise = [
    ...(redacoes ?? []).map((r: any) => r.elogios_pontos_atencao_corretor_1 as string | null),
    ...(simulados ?? []).map((r: any) => r.elogios_pontos_atencao_corretor_1 as string | null),
  ].filter((c): c is string => !!c && c.length > 30);

  // 3. Contagem unificada de erros por competência
  //
  // Fonte primária (redações): para cada texto, detecta as 2 piores competências
  //   (ranking relativo interno). Só conta se nota < 160 — evita penalizar
  //   alunos por competências onde já vão bem.
  //
  // Comentários dos corretores: cada menção negativa a uma competência vale +0.4
  //   e fornece o trecho real para compor o motivo da missão.
  //
  // Fonte secundária (lousas): nota < 7 em uma lousa indica dificuldade
  //   na competência inferida pelo título. Peso reduzido (0.5 por ocorrência)
  //   para não sobrepor o sinal mais rico das redações.

  interface ContagemErro { count: number; somaNotas: number }
  const contagem = new Map<string, ContagemErro>();

  // — Redações e simulados —
  for (const r of todasRedacoes) {
    const notasRedacao = COMPETENCIAS
      .map(c => ({ codigo: c.codigo, nota: (r as any)[c.campo] }))
      .filter(n => typeof n.nota === 'number')
      .sort((a, b) => a.nota - b.nota);

    if (notasRedacao.length === 0) continue;

    // 2 piores desta redação, apenas se < 160
    const detectadas = notasRedacao.slice(0, 2).filter(n => n.nota < 160);

    for (const { codigo, nota } of detectadas) {
      const cur = contagem.get(codigo) ?? { count: 0, somaNotas: 0 };
      cur.count += 1;
      cur.somaNotas += nota;
      contagem.set(codigo, cur);
    }
  }

  // — Lousas corrigidas (fonte secundária, peso 0.5) —
  // Detecta dificuldade quando nota < 7 e o título da lousa indica a competência.
  for (const l of (lousas ?? [])) {
    const titulo = (l as any).lousa?.titulo ?? '';
    const eixo = inferirEixoDaLousa(titulo);
    if (!eixo) continue;

    const nota = typeof l.nota === 'number' ? l.nota : 10;
    if (nota >= 7) continue; // desempenho satisfatório, não conta

    const codigo = ERRO_POR_EIXO[eixo];
    const notaConvertida = nota * 20; // escala 0-10 → 0-200
    const cur = contagem.get(codigo) ?? { count: 0, somaNotas: 0 };
    cur.count += 0.5;
    cur.somaNotas += notaConvertida * 0.5;
    contagem.set(codigo, cur);
  }

  // — Comentários dos corretores (peso 0.4 por detecção negativa) —
  for (const comentario of comentariosParaAnalise) {
    const sinais = extrairSignaisDeComentario(comentario);
    for (const { eixo, trecho } of sinais) {
      const codigo = ERRO_POR_EIXO[eixo];
      if (!codigo) continue;

      // Adiciona peso ao diagnóstico quantitativo
      const cur = contagem.get(codigo) ?? { count: 0, somaNotas: 0 };
      cur.count += 0.4;
      cur.somaNotas += 80 * 0.4; // sintético: menção negativa ≈ abaixo da média
      contagem.set(codigo, cur);

      // Guarda o trecho mais rico para uso no motivo
      const existente = trechosComentario.get(eixo) ?? '';
      if (trecho.length > existente.length) {
        trechosComentario.set(eixo, trecho);
      }
    }
  }

  // — Marcações estruturadas do corretor (FONTE PRINCIPAL, peso 2.0) —
  // Cada aspecto marcado pelo corretor indica um problema pedagógico confirmado.
  // Peso 2x maior que redações pois é diagnóstico direto, não inferência.
  for (const m of (marcacoes ?? [])) {
    const codigo = ERRO_POR_EIXO[m.competencia as string] ?? null;
    if (!codigo) continue;
    const cur = contagem.get(codigo) ?? { count: 0, somaNotas: 0 };
    cur.count += 2.0;
    cur.somaNotas += 60 * 2.0; // sintético: marcação = abaixo da média (60/200)
    contagem.set(codigo, cur);
  }

  // — Quizzes de microaprendizagem (fonte terciária, peso 0.3) —
  // Cada erro em quiz (acertou=false) sinaliza dificuldade no tópico.
  // A competência é inferida pelo título do tópico (mesma lógica das lousas).
  for (const q of (quizErros ?? [])) {
    const tituloTopico = (q as any).questao?.item?.topico?.titulo ?? '';
    if (!tituloTopico) continue;

    const eixo = inferirEixoDaLousa(tituloTopico); // reutiliza o mesmo inferidor
    if (!eixo) continue;

    const codigo = ERRO_POR_EIXO[eixo];
    const cur = contagem.get(codigo) ?? { count: 0, somaNotas: 0 };
    // Nota sintética: quiz errado = desempenho muito baixo (40/200 = 20%)
    cur.count += 0.3;
    cur.somaNotas += 40 * 0.3;
    contagem.set(codigo, cur);
  }

  if (contagem.size === 0) return false;

  // 4. Ordenar: maior recorrência primeiro; em empate, menor nota média (mais urgente)
  const errosOrdenados = Array.from(contagem.entries())
    .map(([codigo, v]) => ({
      codigo,
      count: v.count,
      avgNota: Math.round(v.somaNotas / v.count),
    }))
    .sort((a, b) => {
      if (b.count !== a.count) return b.count - a.count;
      return a.avgNota - b.avgNota; // menor nota = mais urgente no empate
    })
    .slice(0, 3);

  // 5. Upsert na pep_consolidacao_erros
  for (const e of errosOrdenados) {
    const erro = taxonomiaMap.get(e.codigo);
    if (!erro) continue;

    await supabase
      .from('pep_consolidacao_erros')
      .upsert({
        aluno_email: emailNorm,
        erro_id: erro.id,
        recorrencia: e.count,
        ultima_deteccao: new Date().toISOString(),
        atualizado_em: new Date().toISOString(),
      }, { onConflict: 'aluno_email,erro_id' });
  }

  // 6. Tentar buscar recurso vinculado ao erro (se houver no catálogo)
  const { data: recursos } = await supabase
    .from('pep_recursos')
    .select('id, tipo, titulo, tags_erros')
    .eq('ativo', true);

  const recursoParaErro = (codigo: string): string | null => {
    if (!recursos) return null;
    const rec = recursos.find(r => r.tags_erros?.includes(codigo));
    return rec?.id ?? null;
  };

  // 7. Gerar tasks (1 ativa + 2 bloqueadas)
  const agora = new Date().toISOString();
  // "Total" para o motivo = redações + simulados + exercícios corrigidos (fontes primárias)
  const total = todasRedacoes.length;

  const tasksParaInserir = errosOrdenados.map((e, idx) => {
    const erro = taxonomiaMap.get(e.codigo)!;
    const eixoLabel = EIXO_NOME[erro.eixo] ?? erro.eixo;
    const recursoId = recursoParaErro(e.codigo);

    const acaoBase = recursoId
      ? `Acesse o recurso vinculado a esta missão e conclua a atividade proposta.`
      : `Revise o conteúdo sobre ${ERRO_NOME[e.codigo] ?? erro.nome} disponível em Aulas Gravadas ou Microaprendizagem.`;

    // Motivo: prioriza o feedback real dos corretores; usa template pedagógico como fallback
    const trechoCorretor = trechosComentario.get(erro.eixo);
    const descComp = DESCRICAO_COMPETENCIA[erro.eixo] ?? '';
    let motivo: string;
    if (trechoCorretor) {
      const complementoQuant = e.count >= 2
        ? ` Esta dificuldade apareceu em ${Math.round(e.count)} das suas redações analisadas.`
        : '';
      motivo = `Seus corretores identificaram: "${trechoCorretor}"${complementoQuant}`;
    } else if (e.count === 1) {
      motivo = `A ${eixoLabel} avalia a capacidade de ${descComp}. Em uma das suas redações corrigidas, esta foi a competência com pior resultado (nota: ${e.avgNota} pontos).`;
    } else {
      motivo = `A ${eixoLabel} avalia a capacidade de ${descComp}. Ela foi a mais frágil em ${Math.round(e.count)} das suas ${total} redações analisadas (média de ${e.avgNota} pontos).`;
    }

    return {
      aluno_email: emailNorm,
      erro_id: erro.id,
      recurso_id: recursoId,
      titulo: ERRO_NOME[e.codigo] ?? erro.nome,
      motivo,
      acao: acaoBase,
      criterio_conclusao: recursoId
        ? 'Acesse e conclua a atividade vinculada a esta missão.'
        : 'Complete uma atividade sobre esse tema (lousa, exercício ou redação) e demonstre melhora.',
      status: idx === 0 ? 'ativa' : 'bloqueada',
      ordem: idx + 1,
      gerada_por: 'sistema',
      gerada_em: agora,
      ativada_em: idx === 0 ? agora : null,
    };
  });

  const { error: errInsert } = await supabase
    .from('pep_tasks')
    .insert(tasksParaInserir);

  return !errInsert;
}

// ─── Queries ──────────────────────────────────────────────────────────────────

/** Task ativa do aluno */
export function useTaskAtiva(email: string | undefined) {
  return useQuery({
    queryKey: ['pep-task-ativa', email],
    queryFn: async (): Promise<PEPTask | null> => {
      if (!email) return null;
      const { data, error } = await supabase
        .from('pep_tasks')
        .select(`*, erro:pep_taxonomia_erros(*), recurso:pep_recursos(*)`)
        .eq('aluno_email', email.toLowerCase().trim())
        .eq('status', 'ativa')
        .order('ordem', { ascending: true })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data as PEPTask | null;
    },
    enabled: !!email,
    staleTime: 60_000,
  });
}

/** Todas as tasks do aluno (ativa + bloqueadas + histórico) */
export function useTasksAluno(email: string | undefined) {
  return useQuery({
    queryKey: ['pep-tasks-aluno', email],
    queryFn: async (): Promise<PEPTask[]> => {
      if (!email) return [];
      const { data, error } = await supabase
        .from('pep_tasks')
        .select(`*, erro:pep_taxonomia_erros(*), recurso:pep_recursos(*)`)
        .eq('aluno_email', email.toLowerCase().trim())
        .neq('status', 'cancelada')
        .order('ordem', { ascending: true });
      if (error) throw error;
      return (data ?? []) as PEPTask[];
    },
    enabled: !!email,
    staleTime: 60_000,
  });
}

/** Top erros consolidados do aluno */
export function useErrosAluno(email: string | undefined) {
  return useQuery({
    queryKey: ['pep-erros-aluno', email],
    queryFn: async () => {
      if (!email) return [];
      const { data, error } = await supabase
        .from('pep_consolidacao_erros')
        .select('*, erro:pep_taxonomia_erros(*)')
        .eq('aluno_email', email.toLowerCase().trim())
        .order('recorrencia', { ascending: false })
        .limit(10);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!email,
    staleTime: 120_000,
  });
}

// ─── Bootstrap automático ─────────────────────────────────────────────────────

/**
 * Hook que observa se o aluno não tem tasks e dispara o bootstrap retroativo.
 * Executa apenas uma vez por sessão por aluno (controlado via ref).
 */
export function useBootstrapPEP(email: string | undefined) {
  const qc = useQueryClient();
  const bootstrappedRef = useRef<Set<string>>(new Set());

  const { data: tasks, isLoading } = useTasksAluno(email);
  const { mutate: rodarBootstrap, isPending } = useMutation({
    mutationFn: async (em: string) => bootstrapPlanoFromHistorico(em),
    onSuccess: (gerou, em) => {
      if (gerou) {
        qc.invalidateQueries({ queryKey: ['pep-tasks-aluno', em] });
        qc.invalidateQueries({ queryKey: ['pep-task-ativa', em] });
      }
    },
  });

  useEffect(() => {
    if (!email || isLoading || isPending) return;
    if (tasks && tasks.length > 0) return; // já tem tasks, não faz nada
    const key = email.toLowerCase().trim();
    if (bootstrappedRef.current.has(key)) return; // já rodou nesta sessão
    bootstrappedRef.current.add(key);
    rodarBootstrap(key);
  }, [email, isLoading, tasks, isPending]);

  return { bootstrapping: isPending };
}

// ─── Mutations ────────────────────────────────────────────────────────────────

/** Marca a task ativa como concluída e ativa a próxima */
export function useConcluirTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ taskId, alunoEmail }: { taskId: string; alunoEmail: string }) => {
      const { data: taskAtual, error: errBusca } = await supabase
        .from('pep_tasks')
        .select('ordem')
        .eq('id', taskId)
        .single();
      if (errBusca) throw errBusca;

      const { error: errConcluir } = await supabase
        .from('pep_tasks')
        .update({ status: 'concluida', concluida_em: new Date().toISOString() })
        .eq('id', taskId);
      if (errConcluir) throw errConcluir;

      const { data: proxima } = await supabase
        .from('pep_tasks')
        .select('id')
        .eq('aluno_email', alunoEmail.toLowerCase().trim())
        .eq('status', 'bloqueada')
        .gt('ordem', taskAtual.ordem)
        .order('ordem', { ascending: true })
        .limit(1)
        .maybeSingle();

      if (proxima) {
        await supabase
          .from('pep_tasks')
          .update({ status: 'ativa', ativada_em: new Date().toISOString() })
          .eq('id', proxima.id);
      }
    },
    onSuccess: (_, { alunoEmail }) => {
      qc.invalidateQueries({ queryKey: ['pep-task-ativa', alunoEmail] });
      qc.invalidateQueries({ queryKey: ['pep-tasks-aluno', alunoEmail] });
      toast.success('Missão concluída! Próxima missão desbloqueada.');
    },
    onError: () => {
      toast.error('Erro ao concluir missão. Tente novamente.');
    },
  });
}

// ─── Utilitários ──────────────────────────────────────────────────────────────

export function diasParado(ativadaEm: string | null): number | null {
  if (!ativadaEm) return null;
  return Math.floor((Date.now() - new Date(ativadaEm).getTime()) / (1000 * 60 * 60 * 24));
}

export function labelTipoRecurso(tipo: string): string {
  const map: Record<string, string> = {
    aula: 'Aula Gravada',
    micro_topico: 'Microaprendizagem',
    exercicio: 'Exercício',
    lousa: 'Lousa',
    guia_tematico: 'Guia Temático',
    producao_guiada: 'Produção Guiada',
  };
  return map[tipo] ?? tipo;
}

export function rotaRecurso(recurso: PEPRecurso): string {
  switch (recurso.tipo) {
    case 'aula':            return '/aulas';
    case 'micro_topico':    return recurso.recurso_id ? `/microaprendizagem/${recurso.recurso_id}` : '/microaprendizagem';
    case 'exercicio':       return '/exercicios';
    case 'lousa':           return '/lousa';
    case 'guia_tematico':   return '/guia-tematico';
    case 'producao_guiada': return recurso.recurso_id ? `/exercicios/${recurso.recurso_id}/producao-guiada` : '/exercicios';
    default:                return recurso.url_direta ?? '/app';
  }
}
