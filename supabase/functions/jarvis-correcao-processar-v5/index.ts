import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

// ══════════════════════════════════════════════════════════════════
// Jarvis V5 — Pipeline de correção por competência
// Arquitetura: C1-C5 em paralelo → consolidação final
// Status: LOCAL/TESTE — não substitui a V4
// ══════════════════════════════════════════════════════════════════

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ──────────────────────────────────────────────────────────────────
// TIPOS GERAIS
// ──────────────────────────────────────────────────────────────────

interface ProcessarV5Request {
  correcaoId: string;
  transcricaoConfirmada: string;
  professorEmail?: string; // obrigatório no caminho professor
  adminId?: string;        // obrigatório no caminho admin
}

type Competencia = "c1" | "c2" | "c3" | "c4" | "c5";

interface PipelineEtapa {
  tokens_input: number;
  tokens_output: number;
  tempo_ms: number;
}

interface AICallResult {
  text: string;
  tokens_input: number;
  tokens_output: number;
}

interface BancoComentarioRow {
  competencia: string;
  categoria: string | null;
  texto: string;
}

interface ModeloReferenciaRow {
  titulo: string;
  tema: string;
  texto_aluno: string;
  nota_total: number;
  nota_c1: number;
  nota_c2: number;
  nota_c3: number;
  nota_c4: number;
  nota_c5: number;
  justificativa_c1: string | null;
  justificativa_c2: string | null;
  justificativa_c3: string | null;
  justificativa_c4: string | null;
  justificativa_c5: string | null;
}

interface V5PromptPair {
  system: string;
  user_template: string;
}

interface V5Prompts {
  c1: V5PromptPair;
  c2: V5PromptPair;
  c3: V5PromptPair;
  c4: V5PromptPair;
  c5: V5PromptPair;
  consolidacao: V5PromptPair;
}

// ──────────────────────────────────────────────────────────────────
// TIPOS DE RESPOSTA POR COMPETÊNCIA (schema do JSON retornado pela IA)
// ──────────────────────────────────────────────────────────────────

interface C1Response {
  c1: {
    nota: number;
    total_erros: number;
    possui_inversao_sintatica: boolean;
    justificativa: string;
  };
  erros_c1: Array<{
    numero: number;
    paragrafo: number;
    tipo: string;
    descricao: string;
    trecho_original: string;
    sugestao: string;
  }>;
}

interface C2Response {
  c2: { nota: number; justificativa: string };
  analise_c2: {
    atendimento_tema: "completo" | "tangenciamento" | "fuga";
    estrutura_dissertativo_argumentativa: { status: "completa" | "incompleta"; descricao: string };
    /** @deprecated use estrutura_dissertativo_argumentativa.status */
    estrutura?: "completa" | "incompleta";
    possui_tese: boolean;
    tese_identificada: string;
    tipo_tese: string;
    qualidade_tese: string;
    agentes_ou_fatores_causais: string[];
    repertorio: Array<{
      considerado: boolean;
      referencia: string;
      tipo: string;
      pertinencia: string;
      produtividade: string;
      descricao: string;
    }>;
  };
}

interface C3Response {
  c3: { nota: number; justificativa: string };
  analise_c3: {
    paragrafos_desenvolvimento: Array<{
      paragrafo: number;
      topico_frasal: boolean;
      explicacao: { necessaria: boolean; presente: boolean; avaliacao: string };
      embasamento: boolean;
      aplicacao_contexto: boolean;
      causalidade: string;
      aprofundamento: boolean;
      lacunas: string[];
    }>;
    qualidade_geral: string;
    observacoes: string[];
  };
}

interface C4Response {
  c4: { nota: number; justificativa: string };
  analise_c4: {
    elo_interparagrafal: string;
    variedade_conectivos: string;
    adequacao_conectivos: string;
    progressao_referencial: string;
    total_problemas_coesivos: number;
    problemas_identificados: Array<{
      tipo: string;
      paragrafo: number;
      trecho_original: string;
      descricao: string;
      sugestao: string;
    }>;
  };
}

interface C5Response {
  c5: { nota: number; justificativa: string };
  analise_c5: {
    elementos: {
      agente: { status: string; trecho: string };
      acao: { status: string; trecho: string };
      meio: { status: string; trecho: string };
      finalidade: { status: string; trecho: string };
      detalhamento: { status: string; trecho: string; tipo: string; avaliacao: string };
    };
    qualidade_proposta: string;
    respeita_direitos_humanos: boolean;
    relacao_com_tema: string;
    regra_de_teto_aplicada: string;
  };
  proposta_intervencao: string;
}

type CompetenciaRawResult = C1Response | C2Response | C3Response | C4Response | C5Response;

interface PipelineResultado {
  competencia: Competencia;
  raw: CompetenciaRawResult;
  nota: number;
  justificativa: string;
  etapa: PipelineEtapa;
}

// ──────────────────────────────────────────────────────────────────
// PROMPTS V5 — LABORATÓRIO DO REDATOR
// system = prompt completo por competência (inclui escala e schema de saída)
// user_template = apenas tema + texto (+ banco se houver)
// Substituíveis via config.pipeline_v5_prompts (JSONB) no banco.
// ──────────────────────────────────────────────────────────────────

const SISTEMA_C1 = `Você é o Jarvis, corretor oficial do Laboratório do Redator.

Analise EXCLUSIVAMENTE a Competência I (Norma-padrão) da redação abaixo.

══════════════════════════════════════════════
ESCOPO DA ANÁLISE — APENAS C1
══════════════════════════════════════════════

Avalie exclusivamente:

- ortografia
- acentuação
- pontuação
- concordância nominal e verbal
- regência verbal e nominal
- crase
- emprego de pronomes
- tempos e modos verbais
- escolha vocabular inadequada ao registro formal
- estrutura sintática

Avalie obrigatoriamente a estrutura sintática:

- truncamento de período
- ausência de elementos sintáticos obrigatórios, como artigo, preposição ou complemento
- justaposição indevida de orações
- quebra de paralelismo sintático
- paralelismo de estrutura
- paralelismo de artigo
- paralelismo de preposição
- duplicação de termos
- construção frasal incompleta

NÃO avalie nesta etapa:

- conectivos
- coesão
- elo interparagrafal
- progressão referencial
- progressão textual/argumentativa
- desenvolvimento das ideias
- repertório
- tese
- proposta de intervenção

Esses aspectos pertencem a outras competências:
- conectivos, coesão, elo interparagrafal e progressão referencial pertencem à C4
- progressão textual/argumentativa, desenvolvimento das ideias e lacunas argumentativas pertencem à C3
- tese, tema e repertório pertencem à C2
- proposta de intervenção pertence à C5

══════════════════════════════════════════════
REGRA AVANÇADA DE CONTAGEM DE ERROS
══════════════════════════════════════════════

- Erros idênticos repetidos ao longo do texto devem ser contabilizados apenas uma vez.

Exemplo:
"educacao" sem acento, repetido várias vezes, conta como apenas 1 erro.

- Erros diferentes na mesma palavra devem ser contabilizados separadamente.

Exemplo:
"passo" escrito como "passou" conta como 1 erro de grafia.
"passo" escrito como "pásso" conta como outro erro, pois é um erro diferente.

- Erros em categorias diferentes contam separadamente:
acentuação ≠ grafia ≠ concordância ≠ pontuação ≠ regência ≠ crase ≠ sintaxe.

══════════════════════════════════════════════
REGRA DE EXCELÊNCIA SINTÁTICA — OBRIGATÓRIA PARA 200
══════════════════════════════════════════════

Para atingir 200 pontos na Competência I, a redação deve apresentar pelo menos uma inversão sintática bem-sucedida, sem prejuízo de clareza, concordância ou fluidez.

Se a redação não apresentar nenhuma inversão sintática adequada, a nota máxima da C1 será 160, mesmo que não haja desvios gramaticais, ortográficos ou sintáticos.

Exemplo de inversão sintática adequada:
"Diante desse cenário, torna-se evidente a necessidade de intervenção estatal."

Exemplo sem inversão sintática:
"A necessidade de intervenção estatal torna-se evidente diante desse cenário."

══════════════════════════════════════════════
REGRA DE VERIFICAÇÃO OBRIGATÓRIA — PONTUAÇÃO
══════════════════════════════════════════════

Antes de registrar qualquer desvio relacionado a vírgula, execute obrigatoriamente
estas três etapas internas:

ETAPA 1 — VERIFICAÇÃO LITERAL DE PRESENÇA OU AUSÊNCIA
• Para apontar "falta vírgula" numa posição: localize exatamente esse ponto no texto
  original e confirme que a vírgula NÃO está ali. Se a vírgula já existir nessa posição,
  NÃO registre o erro — não há desvio.
• Para apontar "vírgula indevida": confirme que a vírgula está presente no trecho citado.
• O campo trecho_original deve ser cópia literal e fiel do texto — nunca altere, adicione
  ou omita pontuação no que você transcreve como trecho_original.

ETAPA 2 — VERIFICAÇÃO SINTÁTICA ANTES DE CLASSIFICAR "SEPARA SUJEITO E VERBO"
Não classifique uma vírgula como separando sujeito e verbo quando houver, entre o sujeito
e o verbo, qualquer um dos elementos abaixo — nessas estruturas a vírgula é obrigatória
ou plenamente aceitável pela norma-padrão:
• Aposto ou aposto explicativo:
  ex.: "A educação, pilar da democracia, deve ser garantida pelo Estado."
• Adjunto adverbial ou expressão adverbial intercalados:
  ex.: "O governo, nesse contexto, falhou em garantir o acesso à saúde."
• Oração adjetiva explicativa:
  ex.: "O aluno, que estudava todos os dias, foi aprovado no processo seletivo."
• Oração comentativa (iniciada por "o que"):
  ex.: "O Estado negligenciou a educação, o que demonstra descaso histórico."
• Elemento parentético, vocativo ou explicativo de qualquer tipo entre o sujeito e o verbo.
Em todas essas estruturas, a vírgula está correta e não deve ser apontada como desvio.

ETAPA 3 — PRINCÍPIO DA CAUTELA
Em caso de dúvida sobre se um uso de vírgula é correto ou incorreto, NÃO o registre
como erro. Prefira o silêncio ao erro de avaliação. Só aponte desvio de pontuação quando
a infração for inegável e diretamente comprovável pela leitura literal do trecho original.

══════════════════════════════════════════════
REGRAS ABSOLUTAS DE LISTAGEM
══════════════════════════════════════════════

- Cada erro distinto deve gerar um item separado.
- Nunca agrupe erros diferentes no mesmo item.
- Indique obrigatoriamente o parágrafo em que o erro aparece.
- Apresente o trecho exato do erro.
- Apresente sugestão de correção.
- A lista deve ser exaustiva, sem omissões.
- A quantidade total de erros deve ser coerente com a nota atribuída.

══════════════════════════════════════════════
ESCALA C1
══════════════════════════════════════════════

200 — até 2 desvios, no máximo 1 falha sintática, estrutura excelente E presença de pelo menos uma inversão sintática bem-sucedida

160 — até 5 desvios e até 2 falhas sintáticas, estrutura boa OU ausência de inversão sintática bem-sucedida

120 — 6 a 10 desvios e/ou a partir de 3 falhas sintáticas, estrutura regular

80 — 11 a 18 desvios OU estrutura sintática deficitária

40 — mais de 18 desvios OU erros constantes em todas as linhas

0 — desconhecimento total da norma-padrão

REGRA DE LIMITE:
Redações com menos de 300 palavras não podem atingir 200 pontos em C1.

══════════════════════════════════════════════
SAÍDA — RETORNE EXCLUSIVAMENTE JSON
══════════════════════════════════════════════

{
  "c1": {
    "nota": <numero>,
    "total_erros": <numero>,
    "possui_inversao_sintatica": <true|false>,
    "justificativa": "<explicação técnica baseada na quantidade e no tipo de erros>"
  },
  "erros_c1": [
    {
      "numero": 1,
      "paragrafo": <numero>,
      "tipo": "<ortografia|acentuacao|pontuacao|concordancia|regencia|crase|pronome|verbal|sintatico|vocabulario>",
      "descricao": "<descrição clara do erro>",
      "trecho_original": "<trecho exato>",
      "sugestao": "<correção adequada>"
    }
  ]
}`;

const SISTEMA_C2 = `Você é o Jarvis, corretor oficial do Laboratório do Redator.

Analise EXCLUSIVAMENTE a Competência II da redação abaixo.

══════════════════════════════════════════════
ESCOPO DA ANÁLISE — APENAS C2
══════════════════════════════════════════════

Avalie exclusivamente:

1. Atendimento à frase temática
2. Estrutura dissertativo-argumentativa
3. Presença e qualidade da tese
4. Uso do repertório sociocultural

NÃO avalie nesta etapa:

- desenvolvimento dos argumentos
- progressão textual/argumentativa
- causalidade detalhada dos desenvolvimentos
- lacunas argumentativas
- coesão
- conectivos
- proposta de intervenção

Esses aspectos pertencem a outras competências:
- desenvolvimento, progressão textual, causalidade e lacunas pertencem à C3
- coesão, conectivos e progressão referencial pertencem à C4
- proposta de intervenção pertence à C5

══════════════════════════════════════════════
1. TEMA
══════════════════════════════════════════════

Classifique:

- Atendimento completo — aborda integralmente o núcleo temático e o recorte problematizador
- Tangenciamento — abordagem parcial ou desvio de foco
- Fuga ao tema — não aborda o tema

REGRA ABSOLUTA:
Se houver fuga ao tema, a nota desta competência será 0.
Na consolidação final, fuga ao tema deve zerar todas as competências.

══════════════════════════════════════════════
2. ESTRUTURA DISSERTATIVO-ARGUMENTATIVA
══════════════════════════════════════════════

Verifique a presença de:

- introdução
- desenvolvimento
- conclusão

Estrutura incompleta impacta diretamente a nota.

══════════════════════════════════════════════
3. TESE — MODELO LABORATÓRIO
══════════════════════════════════════════════

A tese deve ser analisada como ponto de vista do autor e, preferencialmente, como tese por culpabilidade causal.

A tese por culpabilidade causal apresenta dois agentes, fatores ou responsáveis pelo problema presente na frase temática.

Verifique se há:

- posicionamento claro do autor
- delimitação do problema
- dois agentes/fatores responsáveis pelo problema
- coerência entre os agentes/fatores e a problemática abordada

══════════════════════════════════════════════
QUALIDADE DA TESE
══════════════════════════════════════════════

Avalie:

- os agentes/fatores são coerentes com o problema?
- há relação lógica entre os responsáveis apontados e a problemática?
- há generalização indevida?
- a tese é específica ou vaga?

Agentes inadequados fragilizam a tese.

Exemplo:
Se o aluno atribui ao governo uma responsabilidade que não tem relação direta com o problema discutido, a tese deve ser considerada frágil.

Classificação:

- tese adequada — clara, delimitada e com agentes/fatores coerentes
- tese genérica — apresenta posicionamento, mas sem delimitação suficiente
- tese incoerente — apresenta agentes/fatores inadequados ao problema
- tese ausente — não há ponto de vista identificável

══════════════════════════════════════════════
4. REPERTÓRIO SOCIOCULTURAL
══════════════════════════════════════════════

Classifique cada repertório identificado:

- Legitimado — autor, dado, lei, fato histórico, obra, conceito ou referência reconhecida
- Pertinente — relacionado à frase temática OU a um dos eixos temáticos aos quais pertence a frase temática
- Produtivo — integrado à linha argumentativa e usado para sustentar o raciocínio

══════════════════════════════════════════════
REGRAS DE AVALIAÇÃO DO REPERTÓRIO
══════════════════════════════════════════════

- Basta 1 repertório legitimado, pertinente e produtivo para possibilitar 200 pontos em C2.
- Repertório apenas legitimado, sem pertinência e/ou sem produtividade, equivale a ausência de repertório para fins de pontuação.
- Ausência de repertório leva a 120 pontos, desde que não haja problema maior de tema ou estrutura.
- Repertório decorado sem função argumentativa real deve ser desconsiderado.
- Repertório impertinente deve ser desconsiderado.

══════════════════════════════════════════════
REGRA CRÍTICA — CONCLUSÃO VAGA
══════════════════════════════════════════════

Se houver conclusão genérica, como "é necessário refletir", "devemos agir" ou formulação equivalente, sem concretização mínima:

→ subtrair 80 pontos da nota final de C2.

══════════════════════════════════════════════
ESCALA C2
══════════════════════════════════════════════

200 — tema completo + estrutura completa + ao menos 1 repertório legitimado, pertinente e produtivo + tese adequada por culpabilidade causal, com dois agentes/fatores coerentes

160 — tema completo + estrutura completa + tese clara + repertório pertinente, mas improdutivo

120 — repertório apenas legitimado, sem pertinência ou sem produtividade, OU ausência de repertório

80 — tema tangenciado OU estrutura incompleta

40 — abordagem muito superficial

0 — fuga ao tema

══════════════════════════════════════════════
SAÍDA — RETORNE EXCLUSIVAMENTE JSON
══════════════════════════════════════════════

{
  "c2": {
    "nota": <numero>,
    "justificativa": "<análise detalhada considerando tema, estrutura, tese por culpabilidade causal e repertório>"
  },
  "analise_c2": {
    "atendimento_tema": "<completo|tangenciamento|fuga>",
    "estrutura_dissertativo_argumentativa": {
      "status": "<completa|incompleta>",
      "descricao": "<avalie a presença de introdução, desenvolvimento e conclusão e comente a qualidade da estrutura>"
    },
    "possui_tese": <true|false>,
    "tese_identificada": "<trecho da tese ou string vazia>",
    "tipo_tese": "<causal_com_2_agentes|parcial|ausente>",
    "qualidade_tese": "<adequada|generica|incoerente|ausente>",
    "agentes_ou_fatores_causais": ["<agente/fator 1>", "<agente/fator 2>"],
    "repertorio": [
      {
        "considerado": <true|false>,
        "referencia": "<nome do repertório ou referência identificada>",
        "tipo": "<legitimado|nao_legitimado>",
        "pertinencia": "<pertinente|impertinente>",
        "produtividade": "<produtivo|improdutivo>",
        "descricao": "<explicação do uso>"
      }
    ]
  }
}`;

const SISTEMA_C3 = `Você é o Jarvis, corretor oficial do Laboratório do Redator.

Analise EXCLUSIVAMENTE a Competência III da redação abaixo.

══════════════════════════════════════════════
ESCOPO DA ANÁLISE — APENAS C3
══════════════════════════════════════════════

Avalie exclusivamente:

- desenvolvimento dos argumentos
- organização lógica das ideias
- progressão textual/argumentativa
- relação de causalidade
- presença de lacunas argumentativas
- estrutura da célula argumentativa nos parágrafos de desenvolvimento

NÃO avalie nesta etapa:

- tese
- atendimento ao tema
- repertório como critério de legitimidade, pertinência ou produtividade
- coesão
- conectivos
- proposta de intervenção
- desvios gramaticais

Esses aspectos pertencem a outras competências:
- tese, tema e repertório pertencem à C2
- coesão, conectivos e progressão referencial pertencem à C4
- proposta de intervenção pertence à C5
- norma-padrão pertence à C1

══════════════════════════════════════════════
MODELO OBRIGATÓRIO — CÉLULA ARGUMENTATIVA
══════════════════════════════════════════════

Cada parágrafo de desenvolvimento deve conter, conforme a necessidade argumentativa:

1. Tópico frasal — apresenta a ideia central do parágrafo
2. Explicação do argumento — obrigatória apenas quando o tópico frasal for abstrato, genérico, pouco delimitado ou depender de esclarecimento
3. Embasamento — repertório, fato, dado ou referência que sustente o argumento
4. Aplicação ao contexto brasileiro — aproxima o argumento da realidade nacional
5. Relação de causalidade — explicita causa e consequência
6. Aprofundamento — desenvolve o raciocínio e evita superficialidade

REGRA IMPORTANTE:
Se o tópico frasal for claro, específico e autossuficiente, a ausência de explicação imediata não deve ser considerada lacuna. Nesse caso, o texto pode avançar diretamente para o embasamento sem prejuízo à C3.

══════════════════════════════════════════════
RELAÇÃO DE CAUSALIDADE — CRITÉRIO CENTRAL
══════════════════════════════════════════════

Verifique obrigatoriamente:

- há relação clara entre causa e consequência?
- a consequência decorre logicamente da causa?
- há inversão lógica?
- há causa sem consequência?
- há consequência sem causa?
- há apenas afirmação genérica sem encadeamento causal?

Ausência de causalidade suficiente configura lacuna argumentativa grave.

══════════════════════════════════════════════
LACUNA ARGUMENTATIVA
══════════════════════════════════════════════

Considere como lacuna:

- ideia não explicada quando exigia explicação
- relação implícita sem desenvolvimento
- salto lógico
- exemplo sem interpretação
- enumeração sem análise
- ausência de consequência
- ausência de causa
- aplicação superficial ao contexto brasileiro
- aprofundamento inexistente ou apenas repetitivo

══════════════════════════════════════════════
QUALIDADE DOS ARGUMENTOS
══════════════════════════════════════════════

Avalie:

- os parágrafos de desenvolvimento possuem funções distintas?
- há progressão entre as ideias?
- há aprofundamento real ou apenas repetição?
- há generalizações vagas?
- a ideia-núcleo do tema é mantida?
- os argumentos sustentam o projeto de texto?

══════════════════════════════════════════════
ESCALA C3
══════════════════════════════════════════════

200 — dois parágrafos completos, sem lacunas, progressão consistente e célula argumentativa completa

160 — 1 parágrafo com falha OU lacuna pontual e os dois parágrafos com célula argumentativa completa

120 — múltiplas lacunas OU enumeração de ideias sem argumentação nos dois parágrafos e/ou célula argumentativa incompleta nos dois parágrafos

80 — argumentação rasa ou célula argumentativa incompleta nos dois parágrafos

40 — projeto de texto comprometido e/ou aborda outros assuntos relativos ao tema, mas não a ideia-núcleo

0 — ausência de projeto dissertativo-argumentativo

══════════════════════════════════════════════
SAÍDA — RETORNE EXCLUSIVAMENTE JSON
══════════════════════════════════════════════

{
  "c3": {
    "nota": <numero>,
    "justificativa": "<análise detalhada da argumentação, progressão textual/argumentativa, causalidade e lacunas>"
  },
  "analise_c3": {
    "paragrafos_desenvolvimento": [
      {
        "paragrafo": 1,
        "topico_frasal": <true|false>,
        "explicacao": {
          "necessaria": <true|false>,
          "presente": <true|false>,
          "avaliacao": "<suficiente|ausente_com_prejuizo|dispensavel>"
        },
        "embasamento": <true|false>,
        "aplicacao_contexto": <true|false>,
        "causalidade": "<presente|ausente|inadequada|parcial>",
        "aprofundamento": <true|false>,
        "lacunas": ["<lacuna identificada>"]
      },
      {
        "paragrafo": 2,
        "topico_frasal": <true|false>,
        "explicacao": {
          "necessaria": <true|false>,
          "presente": <true|false>,
          "avaliacao": "<suficiente|ausente_com_prejuizo|dispensavel>"
        },
        "embasamento": <true|false>,
        "aplicacao_contexto": <true|false>,
        "causalidade": "<presente|ausente|inadequada|parcial>",
        "aprofundamento": <true|false>,
        "lacunas": ["<lacuna identificada>"]
      }
    ],
    "qualidade_geral": "<consistente|regular|fragil>",
    "observacoes": ["<ponto relevante da argumentação>"]
  }
}`;

const SISTEMA_C4 = `Você é o Jarvis, corretor oficial do Laboratório do Redator.

Analise EXCLUSIVAMENTE a Competência IV da redação abaixo.

══════════════════════════════════════════════
ESCOPO DA ANÁLISE — APENAS C4
══════════════════════════════════════════════

Avalie exclusivamente:

- conectivos
- uso semântico dos conectivos
- variedade dos recursos coesivos
- elo interparagrafal
- coesão intraparágrafo
- progressão referencial
- retomadas pronominais
- substituições lexicais
- elipses e mecanismos de referenciação

NÃO avalie nesta etapa:

- progressão textual/argumentativa
- qualidade dos argumentos
- causalidade
- lacunas argumentativas
- tese
- repertório
- proposta de intervenção
- desvios gramaticais

Esses aspectos pertencem a outras competências:
- progressão textual/argumentativa, causalidade e lacunas pertencem à C3
- tese, tema e repertório pertencem à C2
- proposta de intervenção pertence à C5
- norma-padrão pertence à C1

══════════════════════════════════════════════
O QUE É COESÃO NESTA COMPETÊNCIA
══════════════════════════════════════════════

Coesão refere-se à articulação linguística entre partes do texto.

Inclui:

- conectivos
- operadores argumentativos
- retomadas pronominais
- substituições lexicais
- elipses
- progressão referencial
- encadeamento linguístico entre frases, períodos e parágrafos

══════════════════════════════════════════════
ELO INTERPARAGRAFAL — OBRIGATÓRIO
══════════════════════════════════════════════

Verifique se há conexão clara entre os parágrafos.

Exemplos de elos possíveis:
- Além disso
- Outrossim
- Ademais
- Nesse sentido
- Sob esse viés
- Portanto
- Diante disso

A ausência de elo interparagrafal compromete a C4.

══════════════════════════════════════════════
USO DE CONECTIVOS — ANÁLISE SEMÂNTICA
══════════════════════════════════════════════

Avalie:

- o conectivo condiz com a ideia expressa?
- há oposição real quando se usa "porém", "contudo", "entretanto"?
- há conclusão real quando se usa "portanto", "logo", "desse modo"?
- há adição real quando se usa "além disso", "ademais", "outrossim"?
- há causa real quando se usa "porque", "visto que", "uma vez que"?
- há consequência real quando se usa "consequentemente", "com isso", "assim"?

Conectivo inadequado semanticamente deve ser considerado erro coesivo.

══════════════════════════════════════════════
PROGRESSÃO REFERENCIAL
══════════════════════════════════════════════

Avalie:

- clareza das retomadas
- ausência de ambiguidade referencial
- manutenção dos referentes ao longo do texto
- uso adequado de pronomes, expressões substitutivas e retomadas nominais

Problemas comuns:

- pronome sem referente claro
- ambiguidade referencial
- retomada inadequada
- repetição excessiva de termos sem variação
- substituição lexical que altera indevidamente o sentido

══════════════════════════════════════════════
REPETIÇÃO E VARIAÇÃO
══════════════════════════════════════════════

Avalie:

- repetição excessiva de conectivos
- uso mecânico do mesmo operador argumentativo
- pobreza de recursos coesivos
- ausência de variação entre retomadas pronominais, lexicais e conectivos

══════════════════════════════════════════════
ERROS COESIVOS — TIPOS
══════════════════════════════════════════════

Considere como erro:

- conectivo inadequado semanticamente
- ausência de conectivo necessário
- ausência de elo interparagrafal
- repetição excessiva de conectivos
- ambiguidade referencial
- retomada incorreta
- quebra na articulação entre frases ou parágrafos
- progressão referencial comprometida

══════════════════════════════════════════════
ESCALA C4
══════════════════════════════════════════════

200 — coesão variada, precisa e correta, com elo interparagrafal claro

160 — até 3 erros de coesão, envolvendo conectivos, elos ou referenciação

120 — 4 ou mais erros coesivos OU repetição de conectivos

80 — presença de mecanismos coesivos, mas com inadequações frequentes, entre 5 e 8 problemas

40 — texto com pouca articulação coesiva

0 — ausência total de articulação

══════════════════════════════════════════════
SAÍDA — RETORNE EXCLUSIVAMENTE JSON
══════════════════════════════════════════════

{
  "c4": {
    "nota": <numero>,
    "justificativa": "<análise da coesão, conectivos, elos interparagrafais, retomadas e referenciação>"
  },
  "analise_c4": {
    "elo_interparagrafal": "<presente|ausente|parcial>",
    "variedade_conectivos": "<adequada|limitada|repetitiva>",
    "adequacao_conectivos": "<adequada|parcialmente_inadequada|inadequada>",
    "progressao_referencial": "<clara|com_problemas|comprometida>",
    "total_problemas_coesivos": <numero>,
    "problemas_identificados": [
      {
        "tipo": "<conectivo_inadequado|ausencia_de_conectivo|ausencia_de_elo|repeticao|ambiguidade_referencial|retomada_incorreta|articulacao_fragil>",
        "paragrafo": <numero>,
        "trecho_original": "<trecho exato>",
        "descricao": "<descrição do problema coesivo>",
        "sugestao": "<sugestão de ajuste>"
      }
    ]
  }
}`;

const SISTEMA_C5 = `Você é o Jarvis, corretor oficial do Laboratório do Redator.

Analise EXCLUSIVAMENTE a Competência V da redação abaixo.

══════════════════════════════════════════════
ESCOPO DA ANÁLISE — APENAS C5
══════════════════════════════════════════════

Avalie exclusivamente a proposta de intervenção apresentada na conclusão da redação.

NÃO avalie nesta etapa:

- coesão
- gramática
- qualidade argumentativa
- tese
- repertório
- progressão textual

Esses aspectos pertencem a outras competências.

══════════════════════════════════════════════
ELEMENTOS OBRIGATÓRIOS
══════════════════════════════════════════════

Verifique a presença dos 5 elementos:

1. Agente — quem executa a ação
2. Ação — o que será feito, com verbo concreto
3. Meio/modo — como será feito, por meio de estratégia, instrumento ou procedimento
4. Finalidade — para que será feito, isto é, objetivo da ação
5. Detalhamento — especificação adicional clara

══════════════════════════════════════════════
DETALHAMENTO — CRITÉRIO REFINADO
══════════════════════════════════════════════

O detalhamento deve apresentar explicitamente uma especificação adicional da ação, com estrutura linguística clara de explicação.

São aceitos como detalhamento válido apenas quando formulados como explicitação adicional:

- explicação mais específica da ação, mostrando como ela será operacionalizada
- indicação explícita de público-alvo, tempo, local ou recurso, desde que apresentada como detalhamento da ação
- panorama após a intervenção, formulado como consequência direta da ação

O detalhamento deve ter "cara de explicação", isto é:
deve ampliar, esclarecer ou especificar a ação de forma concreta.

Exemplos de formulação adequada:

- "por meio de campanhas educativas nas escolas públicas, voltadas aos adolescentes"
- "com a destinação de verbas específicas para regiões periféricas"
- "a fim de reduzir os índices de evasão escolar no país"

══════════════════════════════════════════════
REGRAS CRÍTICAS
══════════════════════════════════════════════

- Omissão de qualquer elemento reduz a nota.
- Proposta vaga reduz a nota.
- Ação ausente: nota máxima 80.
- Estrutura condicional com 2 ou mais elementos válidos: nota máxima 80.
- Formulações genéricas com gerúndio podem invalidar o detalhamento.
- Proposta de intervenção que desrespeita os direitos humanos leva 0 na C5.
- Proposta de intervenção totalmente desconectada do tema leva 0 na C5.

══════════════════════════════════════════════
REGRAS DE TETO POR CONTEXTO
══════════════════════════════════════════════

- Se C2 = 40 por tangenciamento, subtrair 40 pontos em C5.
- Se houver tangenciamento do tema, a C5 não pode ultrapassar 40 pontos.

══════════════════════════════════════════════
DIREITOS HUMANOS
══════════════════════════════════════════════

Verifique se a proposta:

- preserva a dignidade humana
- não defende violência, exclusão, censura abusiva ou eliminação de grupos
- não viola direitos fundamentais

Proposta que desrespeita direitos humanos recebe 0 na C5.

══════════════════════════════════════════════
ESCALA C5
══════════════════════════════════════════════

200 — 5 elementos presentes e bem articulados

160 — 4 elementos presentes

120 — 3 elementos presentes

80 — 2 elementos presentes

40 — 1 elemento válido

0 — proposta ausente OU violação de direitos humanos OU proposta totalmente desconectada do tema

══════════════════════════════════════════════
SAÍDA — RETORNE EXCLUSIVAMENTE JSON
══════════════════════════════════════════════

{
  "c5": {
    "nota": <numero>,
    "justificativa": "<avaliação pedagógica com base na quantidade de elementos, qualidade e possíveis regras de teto>"
  },
  "analise_c5": {
    "elementos": {
      "agente": {
        "status": "<presente|ausente>",
        "trecho": "<trecho identificado ou string vazia>"
      },
      "acao": {
        "status": "<presente|ausente>",
        "trecho": "<trecho identificado ou string vazia>"
      },
      "meio": {
        "status": "<presente|ausente>",
        "trecho": "<trecho identificado ou string vazia>"
      },
      "finalidade": {
        "status": "<presente|ausente>",
        "trecho": "<trecho identificado ou string vazia>"
      },
      "detalhamento": {
        "status": "<presente|ausente>",
        "trecho": "<trecho identificado ou string vazia>",
        "tipo": "<explicacao_da_acao|publico_alvo|tempo|local|recurso|panorama_apos_intervencao|ausente>",
        "avaliacao": "<valido|generico|ausente>"
      }
    },
    "qualidade_proposta": "<completa|parcial|vaga>",
    "respeita_direitos_humanos": <true|false>,
    "relacao_com_tema": "<direta|parcial|ausente>",
    "regra_de_teto_aplicada": "<nenhuma|acao_ausente|estrutura_condicional|tangenciamento|direitos_humanos|desconectada_do_tema>"
  },
  "proposta_intervencao": "Agente: X; Ação: X; Meio: X; Finalidade: X; Detalhamento: X"
}`;

// User template compartilhado por C1-C5
const USER_TEMPLATE_COMPETENCIA = `TEMA: {tema}

TEXTO DO ALUNO:
{texto}{banco_block}`;

const DEFAULT_V5_PROMPTS: V5Prompts = {
  c1: { system: SISTEMA_C1, user_template: USER_TEMPLATE_COMPETENCIA },
  c2: { system: SISTEMA_C2, user_template: USER_TEMPLATE_COMPETENCIA },
  c3: { system: SISTEMA_C3, user_template: USER_TEMPLATE_COMPETENCIA },
  c4: { system: SISTEMA_C4, user_template: USER_TEMPLATE_COMPETENCIA },
  c5: { system: SISTEMA_C5, user_template: USER_TEMPLATE_COMPETENCIA },
  consolidacao: {
    system: `Você é o Jarvis, corretor oficial do Laboratório do Redator.

Você receberá:

- redação original
- resultado da Competência 1 (C1)
- resultado da Competência 2 (C2)
- resultado da Competência 3 (C3)
- resultado da Competência 4 (C4)
- resultado da Competência 5 (C5)

Sua função é CONSOLIDAR esses dados em uma correção final completa, coerente e pedagógica.

══════════════════════════════════════════════
FUNÇÃO DA CONSOLIDAÇÃO
══════════════════════════════════════════════

A consolidação NÃO é apenas junção de dados.

Você deve:

• aplicar regras globais
• resolver inconsistências
• validar coerência entre nota e análise
• gerar feedback pedagógico final

══════════════════════════════════════════════
REGRAS GLOBAIS OBRIGATÓRIAS
══════════════════════════════════════════════

1. FUGA AO TEMA

Se:
c2.analise_c2.atendimento_tema == "fuga"

Então:

→ Todas as competências recebem nota 0
→ nota_total = 0
→ ignorar demais análises

══════════════════════════════════════════════

2. TANGENCIAMENTO DO TEMA

Se:
c2.analise_c2.atendimento_tema == "tangenciamento"

Então:

→ C5 não pode ultrapassar 40 pontos

══════════════════════════════════════════════

3. REGRA DE TETO — C5 POR CONTEXTO

Se:
c2.nota == 40

Então:

→ subtrair 40 pontos da nota de C5

Nunca permitir nota negativa (mínimo = 0).

══════════════════════════════════════════════

4. COERÊNCIA ENTRE ERROS E NOTA (C1)

Verifique:

• quantidade de erros é compatível com a nota?
• regra da inversão sintática foi respeitada?

Se houver inconsistência leve:
→ ajustar justificativa

Se houver inconsistência grave:
→ ajustar a nota

══════════════════════════════════════════════

5. MÚLTIPLOS DE 40

Todas as notas devem ser:

0, 40, 80, 120, 160 ou 200

Se necessário, ajuste.

══════════════════════════════════════════════

6. COERÊNCIA ENTRE COMPETÊNCIAS

Se houver divergências entre análises:

• NÃO apagar nenhuma análise
• preservar cada competência no seu escopo

Exemplo:
Repertório pode ser produtivo (C2) mesmo com falha argumentativa (C3)

══════════════════════════════════════════════
CÁLCULO DA NOTA FINAL
══════════════════════════════════════════════

nota_total = soma de C1 + C2 + C3 + C4 + C5

══════════════════════════════════════════════
VERSÃO LAPIDADA
══════════════════════════════════════════════

Você deve reescrever a redação completa:

• mantendo o tema original
• corrigindo erros gramaticais
• melhorando coesão
• aprimorando argumentação
• ajustando proposta de intervenção

⚠️ NÃO mudar o sentido central do texto
⚠️ NÃO inserir ideias totalmente novas

══════════════════════════════════════════════
SUGESTÕES OBJETIVAS
══════════════════════════════════════════════

Liste de 3 a 5 sugestões claras e diretas, como:

• "Evite repetição de conectivos"
• "Aprofunde a relação de causa e consequência"
• "Utilize repertório de forma produtiva"

══════════════════════════════════════════════
RESUMO GERAL (TOM PEDAGÓGICO)
══════════════════════════════════════════════

Escreva um parágrafo:

• destacando pontos fortes
• indicando principais falhas
• orientando melhoria

Tom:

• respeitoso
• direto
• formativo

══════════════════════════════════════════════
MARCAÇÕES DE TRECHO
══════════════════════════════════════════════

Com base nos problemas identificados em C1-C5, gere marcações individuais — UMA marcação por erro específico.

REGRAS CRÍTICAS:
- CADA marcação aponta UM ÚNICO problema — nunca agrupe múltiplos erros em uma marcação
- "trecho": copie EXATAMENTE a palavra ou expressão mínima problemática do texto original (inclua os erros como estão)
- Para C1 (ortografia/gramática/pontuação): UMA marcação por palavra/vírgula incorreta — ex: "verassidade" e "vunerável" são marcações separadas
- Para C4 (coesão): UMA marcação por conector, pronome referencial ou operador argumentativo inadequado
- Para C2/C3/C5: UMA marcação por problema estrutural/argumentativo identificável com trecho preciso
- "paragrafo": número do parágrafo onde o trecho se encontra (1 = introdução, 2 = 1º desenvolvimento, etc.)
- Gere entre 5 e 20 marcações (quantidade proporcional aos problemas encontrados — não limite artificialmente)
- "comentario": máximo 120 caracteres, diagnóstico direto e pedagógico
- "tipo": "erro" para problemas formais, "ponto_de_atencao" para questões estruturais/argumentativas, "dica" para sugestões
- "sugestao_reescrita": apenas a forma corrigida da palavra/expressão (não a frase inteira), ou null se não aplicável
- Omita marcações quando não houver trecho literalmente identificável

══════════════════════════════════════════════
FORMATO FINAL — JSON OBRIGATÓRIO
══════════════════════════════════════════════

ATENÇÃO — justificativas:
Use \n\n para separar pontos distintos. Exemplo:
"Ponto principal com avaliação geral.\n\nDetalhe dos erros ou aspectos encontrados.\n\nConclusão e enquadramento na nota."

{
  "competencias": {
    "c1": { "nota": <numero>, "justificativa": "<ponto geral>\n\n<detalhes>\n\n<conclusão>" },
    "c2": { "nota": <numero>, "justificativa": "<ponto geral>\n\n<detalhes>\n\n<conclusão>" },
    "c3": { "nota": <numero>, "justificativa": "<ponto geral>\n\n<detalhes>\n\n<conclusão>" },
    "c4": { "nota": <numero>, "justificativa": "<ponto geral>\n\n<detalhes>\n\n<conclusão>" },
    "c5": { "nota": <numero>, "justificativa": "<ponto geral>\n\n<detalhes>\n\n<conclusão>" }
  },
  "nota_total": <numero>,
  "estrutura": {
    "possui_tese": <true|false>,
    "tese_identificada": "<texto>",
    "argumentos": ["<arg1>", "<arg2>"],
    "uso_repertorio": "<análise>",
    "proposta_intervencao": "Agente: X; Ação: X; Meio: X; Finalidade: X; Detalhamento: X"
  },
  "versao_lapidada": "<redação completa reescrita>",
  "sugestoes_objetivas": ["<sug1>", "<sug2>", "<sug3>"],
  "resumo_geral": "<comentário pedagógico final>",
  "marcacoes_trecho": [
    {
      "trecho": "<palavra ou expressão exata copiada do texto>",
      "paragrafo": <numero do parágrafo, 1=introdução>,
      "competencia": "<c1|c2|c3|c4|c5>",
      "tipo": "<erro|dica|ponto_de_atencao>",
      "comentario": "<diagnóstico direto, max 120 chars>",
      "sugestao_reescrita": "<forma corrigida ou null>"
    }
  ]
}`,
    user_template: `TEMA: {tema}

TEXTO ORIGINAL DO ALUNO:
{texto}

=== RESULTADO DA COMPETÊNCIA 1 (C1) ===
{resultado_c1}

=== RESULTADO DA COMPETÊNCIA 2 (C2) ===
{resultado_c2}

=== RESULTADO DA COMPETÊNCIA 3 (C3) ===
{resultado_c3}

=== RESULTADO DA COMPETÊNCIA 4 (C4) ===
{resultado_c4}

=== RESULTADO DA COMPETÊNCIA 5 (C5) ===
{resultado_c5}`,
  },
};

// ──────────────────────────────────────────────────────────────────
// HELPERS
// ──────────────────────────────────────────────────────────────────

function parseJSON<T>(text: string, label?: string): T {
  let s = text.trim();
  // Strip markdown code fences (```json ... ```)
  if (s.startsWith("```")) {
    const nl = s.indexOf("\n");
    if (nl !== -1) {
      s = s.slice(nl + 1).trim();
      const fence = s.lastIndexOf("```");
      if (fence !== -1) s = s.slice(0, fence).trim();
    }
  }
  try { return JSON.parse(s); } catch { /* tenta extração */ }
  // Fallback: extrai entre primeiro { e último }
  const fb = text.indexOf("{"), lb = text.lastIndexOf("}");
  if (fb !== -1 && lb > fb) {
    try { return JSON.parse(text.slice(fb, lb + 1)); } catch { /* falha */ }
  }
  // Loga trecho do texto para diagnóstico sem expor dados sensíveis
  console.error(`❌ parseJSON falhou${label ? ` [${label}]` : ""}. Início: ${text.slice(0, 300)} | Fim: ${text.slice(-200)}`);
  throw new Error("Não foi possível parsear o JSON retornado pela IA");
}

function obterNumeroParagrafo(textoOriginal: string, trecho: string): number {
  const busca = trecho.trim().slice(0, 30);
  const pos = textoOriginal.indexOf(busca);
  if (pos === -1) return 1;
  const antes = textoOriginal.slice(0, pos);
  const blocos = antes.split(/\n+/).filter(b => b.trim().length > 0);
  return blocos.length + 1;
}

function localizarTrecho(texto: string, trecho: string): {
  inicio: number; fim: number; ocorrencia: number;
  contexto_anterior: string; contexto_posterior: string;
} | null {
  const norm = (s: string) => s.trim().replace(/\s+/g, " ");
  const t = norm(texto);
  const q = norm(trecho);
  if (!q) return null;

  let pos = t.indexOf(q);
  let qEfetivo = q;

  // Fallback: tenta prefixo de 50 chars se trecho completo não for encontrado
  if (pos === -1) {
    qEfetivo = q.slice(0, Math.min(50, q.length));
    pos = t.indexOf(qEfetivo);
    if (pos === -1) return null;
  }

  // Conta qual ocorrência é esta (para trechos repetidos)
  let ocorrencia = 1;
  let scan = 0;
  while (true) {
    const found = t.indexOf(qEfetivo, scan);
    if (found === -1 || found >= pos) break;
    ocorrencia++;
    scan = found + 1;
  }

  const fim = pos + qEfetivo.length;
  return {
    inicio: pos,
    fim,
    ocorrencia,
    contexto_anterior: t.slice(Math.max(0, pos - 40), pos),
    contexto_posterior: t.slice(fim, Math.min(t.length, fim + 40)),
  };
}

function arredondarNotaEnem(nota: number): number {
  const validas = [0, 40, 80, 120, 160, 200];
  return validas.reduce((prev, curr) =>
    Math.abs(curr - nota) < Math.abs(prev - nota) ? curr : prev
  );
}

function getNota(comp: Competencia, raw: any): number {
  return arredondarNotaEnem(raw?.[comp]?.nota ?? 0);
}

function getJustificativa(comp: Competencia, raw: any): string {
  return raw?.[comp]?.justificativa ?? "";
}

// ──────────────────────────────────────────────────────────────────
// PÓS-PROCESSAMENTO: filtro de falsos erros de C1
// ──────────────────────────────────────────────────────────────────

function _normalizarTexto(s: string): string {
  return s.trim().replace(/\s+/g, " ").replace(/\s+([,;:.!?])/g, "$1").replace(/([,;:.!?]) +/g, "$1 ");
}

const PADROES_ORACAO_COMENTATIVA = [
  // Orações comentativas com "o que"
  ", o que demonstra", ", o que evidencia", ", o que revela",
  ", o que mostra", ", o que comprova", ", o que indica", ", o que reforça",
  ", o que gera", ", o que causa", ", o que resulta", ", o que implica",
  ", o que configura", ", o que caracteriza", ", o que representa",
];

// Padrões que indicam adjunto/aposto intercalado — vírgula legítima entre sujeito e verbo
const PADROES_ELEMENTO_INTERCALADO = [
  ", segundo ", ", conforme ", ", de acordo com ",
  ", nesse contexto,", ", nesse sentido,", ", nessa perspectiva,",
  ", como se sabe,", ", como é sabido,", ", é sabido,",
];

// Apenas termos técnicos específicos de C4 — evitar "coesão" e conectivos soltos
// que aparecem naturalmente em descrições de erros legítimos de C1
const TERMOS_COESAO_C1 = [
  "repetição de conectivo",
  "elo interparagrafal",
  "progressão referencial",
  "variedade coesiva",
];

function filtrarErrosC1Falsos(erros: any[], correcaoId: string, etapa: string): any[] {
  const descartados: Array<{ motivo: string; tipo: string; trecho: string }> = [];
  const resultado: any[] = [];

  const trchosC4 = new Set(
    erros
      .filter(e => e.competencia_relacionada === "c4" && e.trecho_original)
      .map(e => _normalizarTexto(e.trecho_original.toLowerCase()))
  );

  for (const erro of erros) {
    const comp: string = erro.competencia_relacionada ?? "";
    const desc = (erro.descricao ?? "").toLowerCase();
    const trecho = (erro.trecho_original ?? "").toLowerCase();
    const sug = (erro.sugestao ?? "").toLowerCase();

    // Regra 1 — sugestão idêntica ao trecho original
    if (
      erro.trecho_original && erro.sugestao &&
      _normalizarTexto(erro.trecho_original) === _normalizarTexto(erro.sugestao)
    ) {
      descartados.push({ motivo: "sugestao_identica_ao_original", tipo: erro.tipo, trecho: erro.trecho_original.slice(0, 80) });
      continue;
    }

    if (comp === "c1") {
      // Regra 2 — vírgula classificada como "entre sujeito e verbo" mas estrutura justifica
      if (desc.includes("vírgula entre sujeito e verbo") || desc.includes("separando sujeito do verbo") ||
          desc.includes("vírgula antes do verbo") || desc.includes("separa sujeito")) {
        if (
          PADROES_ORACAO_COMENTATIVA.some(p => trecho.includes(p)) ||
          PADROES_ELEMENTO_INTERCALADO.some(p => trecho.includes(p))
        ) {
          descartados.push({ motivo: "virgula_elemento_intercalado_ou_comentativa", tipo: erro.tipo, trecho: (erro.trecho_original ?? "").slice(0, 80) });
          continue;
        }
      }

      // Regra 5 — "falta vírgula" mas trecho_original já contém vírgula e texto limpo é idêntico à sugestão
      // (AI afirma ausência de vírgula mas ela já estava presente no texto)
      if (
        erro.tipo === "pontuacao" &&
        (desc.includes("falt") || desc.includes("ausência") || desc.includes("ausencia")) &&
        (desc.includes("vírgula") || desc.includes("virgula")) &&
        erro.trecho_original && erro.sugestao &&
        (erro.trecho_original as string).includes(",")
      ) {
        const origSemVirgula = _normalizarTexto((erro.trecho_original as string).replace(/,/g, " ")).toLowerCase();
        const sugSemVirgula = _normalizarTexto((erro.sugestao as string).replace(/,/g, " ")).toLowerCase();
        if (origSemVirgula === sugSemVirgula) {
          descartados.push({ motivo: "falsa_ausencia_virgula_presente_no_trecho", tipo: erro.tipo, trecho: (erro.trecho_original ?? "").slice(0, 80) });
          continue;
        }
      }

      // Regra 3 — problema de coesão/conectivo classificado erroneamente em C1
      if (TERMOS_COESAO_C1.some(t => desc.includes(t) || trecho.includes(t))) {
        const trechoNorm = _normalizarTexto(trecho);
        if (erro.trecho_original && !trchosC4.has(trechoNorm)) {
          // Reclassificar para C4
          resultado.push({
            ...erro,
            competencia_relacionada: "c4",
            tipo: (erro.tipo ?? "").replace(/^C1/, "C4"),
          });
          trchosC4.add(trechoNorm);
          descartados.push({ motivo: "reclassificado_c1_para_c4", tipo: erro.tipo, trecho: (erro.trecho_original ?? "").slice(0, 80) });
        } else {
          descartados.push({ motivo: "coesao_c1_descartado_ja_existe_c4", tipo: erro.tipo, trecho: (erro.trecho_original ?? "").slice(0, 80) });
        }
        continue;
      }

      // Regra 4 — troca estilística de infinitivo flexionado (ambas as formas são aceitas)
      if (desc.includes("concordância") && trecho.includes("a utilizarem") && sug.includes("a utilizar")) {
        descartados.push({ motivo: "infinitivo_flexionado_estilistico", tipo: erro.tipo, trecho: (erro.trecho_original ?? "").slice(0, 80) });
        continue;
      }
    }

    resultado.push(erro);
  }

  if (descartados.length > 0) {
    console.log(`🔍 [FILTRO C1] id=${correcaoId} etapa=${etapa} | ${descartados.length} descartado(s):`);
    for (const d of descartados) {
      console.log(`   [${d.motivo}] tipo="${d.tipo}" trecho="${d.trecho}"`);
    }
  }

  // Renumerar sequencialmente após filtragem
  return resultado.map((e, i) => ({ ...e, numero: i + 1 }));
}

// Normaliza erros de todos os formatos V5 para o array compatível com V4
function normalizarErros(resultados: PipelineResultado[]): any[] {
  let num = 1;
  const erros: any[] = [];

  const byComp = new Map(resultados.map(r => [r.competencia, r.raw]));

  // C1: erros_c1 explícitos
  const c1raw = byComp.get("c1") as C1Response | undefined;
  for (const e of (c1raw?.erros_c1 ?? [])) {
    erros.push({
      numero: num++,
      paragrafo: e.paragrafo,
      tipo: `C1 — ${e.tipo}`,
      competencia_relacionada: "c1",
      descricao: `Parágrafo ${e.paragrafo}: ${e.descricao}`,
      trecho_original: e.trecho_original,
      sugestao: e.sugestao,
    });
  }

  // C3: lacunas por parágrafo
  const c3raw = byComp.get("c3") as C3Response | undefined;
  for (const p of (c3raw?.analise_c3?.paragrafos_desenvolvimento ?? [])) {
    for (const lacuna of (p.lacunas ?? [])) {
      if (lacuna) {
        erros.push({
          numero: num++,
          tipo: "C3 — lacuna argumentativa",
          competencia_relacionada: "c3",
          descricao: `Parágrafo ${p.paragrafo}: ${lacuna}`,
          trecho_original: "",
          sugestao: "Desenvolva este aspecto argumentativo",
        });
      }
    }
  }

  // C4: problemas coesivos explícitos
  const c4raw = byComp.get("c4") as C4Response | undefined;
  for (const p of (c4raw?.analise_c4?.problemas_identificados ?? [])) {
    erros.push({
      numero: num++,
      tipo: `C4 — ${p.tipo}`,
      competencia_relacionada: "c4",
      descricao: `Parágrafo ${p.paragrafo}: ${p.descricao}`,
      trecho_original: p.trecho_original,
      sugestao: p.sugestao,
    });
  }

  // C5: elementos ausentes
  const c5raw = byComp.get("c5") as C5Response | undefined;
  const elementos = c5raw?.analise_c5?.elementos ?? {};
  for (const [elem, data] of Object.entries(elementos)) {
    if ((data as any).status === "ausente") {
      erros.push({
        numero: num++,
        tipo: "C5 — elemento ausente na proposta",
        competencia_relacionada: "c5",
        descricao: `Elemento ausente: ${elem}`,
        trecho_original: "",
        sugestao: `Inclua o elemento '${elem}' na proposta de intervenção`,
      });
    }
  }

  return erros;
}

// Formata os resultados do pipeline para o prompt de consolidação
function buildBancoForCompetencia(banco: BancoComentarioRow[], comp: Competencia): string {
  const items = banco.filter(b => b.competencia === comp || b.competencia === "geral");
  if (!items.length) return "";
  let bloco = "\n\n---\nORIENTAÇÕES PEDAGÓGICAS ADICIONAIS:\n";
  for (const item of items) bloco += `- ${item.texto}\n`;
  bloco += "---";
  return bloco;
}

function buildFewShotBlock(modelos: ModeloReferenciaRow[]): string {
  if (!modelos.length) return "";

  let bloco = "\n\n---\n# EXEMPLOS DE REFERÊNCIA (Calibração do padrão de correção)\n";
  bloco += "Use os exemplos abaixo como referência do padrão esperado para notas e justificativas. Calibre sua avaliação em relação a esses modelos.\n\n";

  for (let i = 0; i < modelos.length; i++) {
    const m = modelos[i];
    const textoResumido = m.texto_aluno.length > 600
      ? m.texto_aluno.substring(0, 600) + "..."
      : m.texto_aluno;

    bloco += `## Exemplo ${i + 1}: ${m.titulo}\n`;
    bloco += `**Tema:** ${m.tema}\n\n`;
    bloco += `**Texto do aluno (trecho):**\n"${textoResumido}"\n\n`;
    bloco += `**Gabarito de notas:** Total: ${m.nota_total} | C1: ${m.nota_c1} | C2: ${m.nota_c2} | C3: ${m.nota_c3} | C4: ${m.nota_c4} | C5: ${m.nota_c5}\n`;

    if (m.justificativa_c1) bloco += `**Justificativa C1:** ${m.justificativa_c1}\n`;
    if (m.justificativa_c2) bloco += `**Justificativa C2:** ${m.justificativa_c2}\n`;
    if (m.justificativa_c3) bloco += `**Justificativa C3:** ${m.justificativa_c3}\n`;
    if (m.justificativa_c4) bloco += `**Justificativa C4:** ${m.justificativa_c4}\n`;
    if (m.justificativa_c5) bloco += `**Justificativa C5:** ${m.justificativa_c5}\n`;
    bloco += "\n";
  }

  bloco += "---";
  return bloco;
}

function buildBancoForConsolidacao(banco: BancoComentarioRow[]): string {
  if (!banco.length) return "";
  const grupos: Record<string, string[]> = {};
  for (const item of banco) {
    if (!grupos[item.competencia]) grupos[item.competencia] = [];
    grupos[item.competencia].push(item.texto);
  }
  const labels: Record<string, string> = {
    geral: "GERAIS", c1: "C1", c2: "C2", c3: "C3", c4: "C4", c5: "C5",
  };
  let bloco = "\n\n---\nBANCO DE ORIENTAÇÕES (selecionar aplicáveis para orientacoes_selecionadas):\n";
  for (const comp of ["geral", "c1", "c2", "c3", "c4", "c5"]) {
    const items = grupos[comp];
    if (!items?.length) continue;
    bloco += `[${labels[comp]}]\n`;
    for (const texto of items) bloco += `- ${texto}\n`;
    bloco += "\n";
  }
  bloco += "---";
  return bloco;
}

// Limites de saída por modelo (completion tokens)
const MODEL_OUTPUT_LIMITS: Record<string, number> = {
  "gpt-4o": 16384,
  "gpt-4o-mini": 16384,
  "gpt-4": 8192,
  "gpt-4-turbo": 4096,
  "gpt-3.5-turbo": 4096,
  // Anthropic (conservador — modelos recentes suportam mais, mas cap seguro)
  "claude-sonnet-4-6": 16000,
  "claude-opus-4-7": 16000,
  "claude-haiku-4-5-20251001": 8192,
  "claude-3-5-sonnet-20241022": 8192,
  "claude-3-5-haiku-20241022": 8192,
  "claude-3-opus-20240229": 4096,
  // Gemini não precisa de entry — sem limite prático no intervalo usado
};

/**
 * Retorna o max_tokens efetivo para a chamada à IA.
 * - Usa `configured` (do banco) se disponível; senão usa `fallback`.
 * - Nunca ultrapassa o limite do modelo se ele for conhecido.
 */
function clampMaxTokens(model: string, configured: number, fallback: number): number {
  const base = configured > 0 ? configured : fallback;
  const limit = MODEL_OUTPUT_LIMITS[model] ?? Infinity;
  return Math.min(Math.max(base, fallback), limit);
}

function calcularCusto(model: string, inputTokens: number, outputTokens: number): number {
  const custos: Record<string, { input: number; output: number }> = {
    "gpt-4o": { input: 2.50, output: 10.0 },
    "gpt-4o-mini": { input: 0.15, output: 0.60 },
    "gpt-4": { input: 30.0, output: 60.0 },
    "gpt-3.5-turbo": { input: 0.50, output: 1.50 },
    "gemini-2.5-flash-preview-04-17": { input: 0.15, output: 0.60 },
    "gemini-2.5-flash-preview": { input: 0.15, output: 0.60 },
    "gemini-2.5-flash": { input: 0.15, output: 0.60 },
    "gemini-2.5-pro-preview-03-25": { input: 1.25, output: 10.0 },
    "gemini-2.5-pro-preview": { input: 1.25, output: 10.0 },
    "gemini-pro-latest": { input: 1.25, output: 10.0 },
    "gemini-2.0-flash": { input: 0.10, output: 0.40 },
    "gemini-1.5-flash": { input: 0.075, output: 0.30 },
    "gemini-1.5-pro": { input: 3.5, output: 10.5 },
    "claude-sonnet-4-6": { input: 3.0, output: 15.0 },
    "claude-opus-4-7": { input: 15.0, output: 75.0 },
    "claude-haiku-4-5-20251001": { input: 0.8, output: 4.0 },
    "claude-3-5-sonnet-20241022": { input: 3.0, output: 15.0 },
    "claude-3-5-haiku-20241022": { input: 0.8, output: 4.0 },
    "claude-3-opus-20240229": { input: 15.0, output: 75.0 },
    "claude-3-haiku-20240307": { input: 0.25, output: 1.25 },
  };
  const cost = custos[model] ?? { input: 0.15, output: 0.60 };
  return (inputTokens / 1_000_000) * cost.input + (outputTokens / 1_000_000) * cost.output;
}

async function callAI(
  provider: string,
  model: string,
  temperature: number,
  maxTokens: number,
  systemPrompt: string,
  userPrompt: string,
  thinkingBudget?: number,
): Promise<AICallResult> {
  if (provider === "anthropic") {
    const key = Deno.env.get("ANTHROPIC_API_KEY");
    if (!key) throw new Error("ANTHROPIC_API_KEY não configurada");
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({ model, system: systemPrompt, messages: [{ role: "user", content: userPrompt }], max_tokens: maxTokens, temperature }),
    });
    if (!res.ok) throw new Error(`Anthropic API error: ${await res.text()}`);
    const data = await res.json();
    const text = data.content?.[0]?.text;
    if (!text) throw new Error("Resposta vazia da Anthropic");
    return { text, tokens_input: data.usage?.input_tokens ?? 0, tokens_output: data.usage?.output_tokens ?? 0 };
  }

  if (provider === "openai") {
    const key = Deno.env.get("OPENAI_API_KEY");
    if (!key) throw new Error("OPENAI_API_KEY não configurada");
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${key}` },
      body: JSON.stringify({
        model,
        messages: [{ role: "system", content: systemPrompt }, { role: "user", content: userPrompt }],
        max_tokens: maxTokens,
        temperature,
        response_format: { type: "json_object" },
      }),
    });
    if (!res.ok) throw new Error(`OpenAI API error: ${await res.text()}`);
    const data = await res.json();
    const text = data.choices?.[0]?.message?.content;
    if (!text) throw new Error("Resposta vazia da OpenAI");
    return { text, tokens_input: data.usage?.prompt_tokens ?? 0, tokens_output: data.usage?.completion_tokens ?? 0 };
  }

  // Gemini
  const key = Deno.env.get("GEMINI_API_KEY");
  if (!key) throw new Error("GEMINI_API_KEY não configurada");
  const geminiModel = model.startsWith("gemini-") ? model : "gemini-2.5-flash";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${key}`;

  // Controla thinking budget em modelos 2.5 Pro para não consumir tokens de output
  // O thinkingBudget limita o thinking interno, preservando espaço para o JSON final
  const isProThinking = geminiModel.includes("pro") || geminiModel === "gemini-pro-latest";
  const budget = thinkingBudget ?? (isProThinking ? Math.floor(maxTokens * 0.25) : undefined);
  const generationConfig: Record<string, unknown> = {
    temperature,
    maxOutputTokens: maxTokens,
    responseMimeType: "application/json",
  };
  if (budget !== undefined) generationConfig.thinkingConfig = { thinkingBudget: budget };

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: systemPrompt }] },
      contents: [{ role: "user", parts: [{ text: userPrompt }] }],
      generationConfig,
    }),
  });
  if (!res.ok) throw new Error(`Gemini API error: ${await res.text()}`);
  const data = await res.json();

  // Log de diagnóstico: tokens de thinking vs output e finish_reason
  const finishReason = data.candidates?.[0]?.finishReason;
  const thoughtTokens = data.usageMetadata?.thoughtsTokenCount ?? 0;
  const outputTokens = data.usageMetadata?.candidatesTokenCount ?? 0;
  console.log(`  🧠 Gemini finish=${finishReason} | thinking=${thoughtTokens} output=${outputTokens} budget=${budget ?? "auto"}`);
  if (finishReason === "MAX_TOKENS") {
    console.error(`  ⚠️ MAX_TOKENS atingido! thinking=${thoughtTokens} output=${outputTokens} maxOutputTokens=${maxTokens}`);
  }

  const allParts: any[] = data.candidates?.[0]?.content?.parts ?? [];
  const textParts = allParts.filter((p: any) => !p.thought && p.text);
  // Junta TODAS as partes de texto (modelos com thinking podem dividir o output em múltiplas partes)
  const text = (textParts.length > 0 ? textParts : allParts).map((p: any) => p.text ?? "").join("");
  if (!text) throw new Error("Resposta vazia do Gemini");
  return { text, tokens_input: data.usageMetadata?.promptTokenCount ?? 0, tokens_output: outputTokens };
}

// ──────────────────────────────────────────────────────────────────
// HANDLER PRINCIPAL
// ──────────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  let correcaoId: string | undefined;
  let professorId: string | undefined;
  let custoCreditos = 1;
  let creditoConsumido = false;
  let creditResult: { creditos_atuais: number } | undefined;

  try {
    console.log("🤖 Jarvis V5 — Pipeline iniciado");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { correcaoId: cId, transcricaoConfirmada, professorEmail, adminId }: ProcessarV5Request = await req.json();
    correcaoId = cId;

    const ehAdmin = !!adminId && !professorEmail;

    if (!cId || !transcricaoConfirmada || (!professorEmail && !adminId)) {
      return new Response(
        JSON.stringify({ error: "correcaoId, transcricaoConfirmada e (professorEmail ou adminId) são obrigatórios" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ══════════════════════════════════════════════════════════════
    // 1. CONFIGURAÇÃO ATIVA
    // ══════════════════════════════════════════════════════════════
    const { data: config, error: configError } = await supabase.rpc("get_active_correcao_config").single();
    if (configError || !config) throw new Error("SISTEMA BLOQUEADO: Nenhuma configuração ativa encontrada.");
    console.log(`✅ Config: v${config.versao} — ${config.nome} | ${config.model} | provider: ${config.provider ?? "openai"}`);

    const dbPrompts = (config.pipeline_v5_prompts ?? {}) as Partial<V5Prompts>;
    const resolvePromptPair = (key: keyof V5Prompts): V5PromptPair => {
      const db = dbPrompts[key];
      const def = DEFAULT_V5_PROMPTS[key];
      return {
        system: db?.system?.trim() ? db.system : def.system,
        user_template: db?.user_template?.trim() ? db.user_template : def.user_template,
      };
    };
    const v5Prompts: V5Prompts = {
      c1: resolvePromptPair("c1"),
      c2: resolvePromptPair("c2"),
      c3: resolvePromptPair("c3"),
      c4: resolvePromptPair("c4"),
      c5: resolvePromptPair("c5"),
      consolidacao: resolvePromptPair("consolidacao"),
    };

    // ══════════════════════════════════════════════════════════════
    // 2. BANCO DE COMENTÁRIOS + MODELOS DE REFERÊNCIA
    // ══════════════════════════════════════════════════════════════
    const [bancoResult, modelosResult] = await Promise.all([
      supabase
        .from("jarvis_correcao_banco_comentarios")
        .select("competencia, categoria, texto")
        .eq("ativo", true)
        .order("criado_em", { ascending: true }),
      supabase
        .from("jarvis_correcao_modelos_referencia")
        .select("titulo, tema, texto_aluno, nota_total, nota_c1, nota_c2, nota_c3, nota_c4, nota_c5, justificativa_c1, justificativa_c2, justificativa_c3, justificativa_c4, justificativa_c5")
        .eq("ativo", true)
        .order("prioridade", { ascending: false })
        .limit(2),
    ]);

    const bancoItems: BancoComentarioRow[] = bancoResult.data ?? [];
    const modelosReferencia: ModeloReferenciaRow[] = modelosResult.data ?? [];
    const fewShotBloco = buildFewShotBlock(modelosReferencia);
    console.log(`📚 Banco: ${bancoItems.length} orientações | 📖 Modelos referência: ${modelosReferencia.length}`);

    // ══════════════════════════════════════════════════════════════
    // 3. CORREÇÃO
    // ══════════════════════════════════════════════════════════════
    const { data: correcao, error: correcaoErr } = await supabase
      .from("jarvis_correcoes").select("*").eq("id", cId).single();
    if (correcaoErr || !correcao) throw new Error("Correção não encontrada");
    if (correcao.status === "corrigida") throw new Error("Esta correção já foi processada");
    console.log(`📝 Tema: ${correcao.tema} | Aluno: ${correcao.autor_nome}`);

    // ══════════════════════════════════════════════════════════════
    // 4. PROFESSOR + CRÉDITO  (ignorado no caminho admin)
    // ══════════════════════════════════════════════════════════════
    if (!ehAdmin) {
      const { data: professor, error: profErr } = await supabase
        .from("professores")
        .select("id, jarvis_correcao_creditos, nome_completo")
        .eq("email", professorEmail!.toLowerCase().trim())
        .eq("ativo", true)
        .single();
      if (profErr || !professor) throw new Error("Professor não encontrado");

      const { data: creditResultData, error: creditErr } = await supabase.rpc("consumir_credito_professor", {
        professor_id_param: professor.id,
        quantidade: config.custo_creditos,
      });
      if (creditErr || !creditResultData?.success) throw new Error(creditResultData?.error || "Erro ao consumir créditos.");

      professorId = professor.id;
      custoCreditos = config.custo_creditos;
      creditoConsumido = true;
      creditResult = creditResultData;

      console.log(`💳 ${professor.nome_completo}: ${creditResultData.creditos_anteriores} → ${creditResultData.creditos_atuais} créditos`);

      await supabase
        .from("jarvis_correcao_credit_audit")
        .update({ correcao_id: correcaoId })
        .eq("professor_id", professor.id)
        .is("correcao_id", null)
        .order("created_at", { ascending: false })
        .limit(1);
    } else {
      console.log("🔑 Modo admin — sem consumo de créditos");
    }

    // Persiste texto — permite identificar o estado antes do processamento
    await supabase
      .from("jarvis_correcoes")
      .update({ transcricao_confirmada: transcricaoConfirmada, status: "aguardando_correcao" })
      .eq("id", correcaoId);

    // ══════════════════════════════════════════════════════════════
    // 5. PIPELINE — C1 a C5 EM PARALELO
    // ══════════════════════════════════════════════════════════════
    const provider = config.provider ?? "openai";
    const temperatura = parseFloat(String(config.temperatura));
    const maxTokensComp = clampMaxTokens(config.model, config.max_tokens ?? 0, 6000);
    const competencias: Competencia[] = ["c1", "c2", "c3", "c4", "c5"];

    console.log(`🔄 Pipeline C1-C5 em paralelo | ${config.model} | temp: ${temperatura} | maxTokensComp: ${maxTokensComp}`);
    const pipelineStart = Date.now();

    const resultadosPipeline: PipelineResultado[] = await Promise.all(
      competencias.map(async (comp): Promise<PipelineResultado> => {
        const prompts = v5Prompts[comp] as V5PromptPair;
        const bancoBlock = buildBancoForCompetencia(bancoItems, comp);
        const userPrompt = prompts.user_template
          .replace(/\{tema\}/g, correcao.tema)
          .replace(/\{texto\}/g, transcricaoConfirmada)
          .replace(/\{banco_block\}/g, bancoBlock);

        const t0 = Date.now();
        const aiResult = await callAI(provider, config.model, temperatura, maxTokensComp, prompts.system, userPrompt);
        const tempo_ms = Date.now() - t0;

        const raw = parseJSON<CompetenciaRawResult>(aiResult.text, comp);
        const nota = getNota(comp, raw);
        const justificativa = getJustificativa(comp, raw);

        console.log(`  ✅ ${comp.toUpperCase()}: ${nota}/200 | ${tempo_ms}ms`);
        return {
          competencia: comp,
          raw,
          nota,
          justificativa,
          etapa: { tokens_input: aiResult.tokens_input, tokens_output: aiResult.tokens_output, tempo_ms },
        };
      })
    );

    console.log(`✅ Pipeline C1-C5: ${Date.now() - pipelineStart}ms`);

    const byComp = new Map(resultadosPipeline.map(r => [r.competencia, r]));
    const c2raw = byComp.get("c2")!.raw as C2Response;
    const atendimentoTema = c2raw?.analise_c2?.atendimento_tema;

    // ══════════════════════════════════════════════════════════════
    // 6. CONSOLIDAÇÃO FINAL
    // O consolidador recebe os JSONs brutos de cada competência e
    // aplica as regras globais (fuga, tangenciamento, teto C5, etc.)
    // produzindo o JSON final compatível com V4.
    // ══════════════════════════════════════════════════════════════
    console.log("🔗 Consolidando resultados...");
    const consolidacaoStart = Date.now();
    // Consolidação usa fallback maior (10000) para comportar versao_lapidada + análises completas
    const maxTokensConsol = clampMaxTokens(config.model, config.max_tokens ?? 0, 10000);
    console.log(`  🔗 maxTokensConsol: ${maxTokensConsol}`);

    const consolPrompts = v5Prompts.consolidacao;
    // Few-shot no system prompt da consolidação (mesma abordagem do V4)
    const consolSystem = fewShotBloco
      ? consolPrompts.system + "\n\n" + fewShotBloco
      : consolPrompts.system;

    const consolUserPrompt = consolPrompts.user_template
      .replace(/\{tema\}/g, correcao.tema)
      .replace(/\{texto\}/g, transcricaoConfirmada)
      .replace(/\{resultado_c1\}/g, JSON.stringify(byComp.get("c1")!.raw, null, 2))
      .replace(/\{resultado_c2\}/g, JSON.stringify(byComp.get("c2")!.raw, null, 2))
      .replace(/\{resultado_c3\}/g, JSON.stringify(byComp.get("c3")!.raw, null, 2))
      .replace(/\{resultado_c4\}/g, JSON.stringify(byComp.get("c4")!.raw, null, 2))
      .replace(/\{resultado_c5\}/g, JSON.stringify(byComp.get("c5")!.raw, null, 2));

    const consolAI = await callAI(provider, config.model, temperatura, maxTokensConsol, consolSystem, consolUserPrompt);
    const tempoConsol = Date.now() - consolidacaoStart;
    const consolResult = parseJSON<any>(consolAI.text, "consolidacao");
    console.log(`✅ Consolidação: ${tempoConsol}ms`);

    // ══════════════════════════════════════════════════════════════
    // 7. EXTRAIR NOTAS FINAIS DO CONSOLIDADOR (com validação)
    // Prioridade: notas do consolidador (já com regras aplicadas)
    // Fallback: notas brutas do pipeline
    // ══════════════════════════════════════════════════════════════
    const notaFinal = (comp: string) => {
      const n = consolResult?.competencias?.[comp]?.nota;
      return arredondarNotaEnem(typeof n === "number" ? n : byComp.get(comp as Competencia)!.nota);
    };

    let notaC1 = notaFinal("c1");
    const notaC2 = notaFinal("c2");
    const notaC3 = notaFinal("c3");
    const notaC4 = notaFinal("c4");
    const notaC5 = notaFinal("c5");

    // ══════════════════════════════════════════════════════════════
    // 7.1 CORREÇÃO DE COERÊNCIA C1
    // Se o pipeline confirmou inversão sintática + ≤2 desvios + ≤1 falha
    // sintática + ≥300 palavras, a nota deve ser 200, independente do
    // que o consolidador retornou.
    // ══════════════════════════════════════════════════════════════
    const c1rawData = byComp.get("c1")!.raw as C1Response;
    const totalPalavras = transcricaoConfirmada.trim().split(/\s+/).length;
    const errosC1Lista = c1rawData.erros_c1 ?? [];
    // Usa erros_c1.length como contagem real — c1.total_erros pode ser inconsistente com a lista
    const errosC1Count = errosC1Lista.length;
    const falhasSintaticasC1 = errosC1Lista.filter((e: any) => e.tipo === "sintatico").length;
    let justificativaC1Override: string | undefined;

    if (
      c1rawData.c1?.possui_inversao_sintatica === true &&
      errosC1Count <= 2 &&
      falhasSintaticasC1 <= 1 &&
      totalPalavras >= 300 &&
      notaC1 < 200
    ) {
      console.log(`🔧 [C1 COERÊNCIA] Nota corrigida: ${notaC1} → 200 | erros_c1.length=${errosC1Count} | falhas_sin=${falhasSintaticasC1} | palavras=${totalPalavras}`);
      notaC1 = 200;
      justificativaC1Override =
        "O texto apresenta até 2 desvios, no máximo 1 falha sintática e possui inversão sintática bem-sucedida, atendendo aos critérios de 200 pontos na C1.";
    }

    const notaTotal = notaC1 + notaC2 + notaC3 + notaC4 + notaC5;

    // Sempre usa erros do pipeline (C1 erros_c1, C3 lacunas, C4 problemas, C5 elementos ausentes)
    // O consolidador retorna erros em formato incompleto — ignoramos e usamos a fonte original
    const errosRaw: any[] = normalizarErros(resultadosPipeline);
    const errosMapeados = errosRaw.map((e: any, idx: number) => ({
      numero: e.numero ?? idx + 1,
      paragrafo: e.paragrafo,
      tipo: e.tipo ?? "C1",
      competencia_relacionada: e.competencia_relacionada ?? "c1",
      descricao: e.descricao ?? "",
      trecho_original: e.trecho_original ?? "",
      sugestao: e.sugestao ?? "",
    }));
    const erros = filtrarErrosC1Falsos(errosMapeados, correcaoId, "pipeline");

    // ══════════════════════════════════════════════════════════════
    // 8. MONTAR CORRECAO_IA (schema compatível com V4)
    // ══════════════════════════════════════════════════════════════
    const correcaoIA = {
      // Notas e justificativas finais (do consolidador, com regras aplicadas)
      competencias: {
        c1: { nota: notaC1, justificativa: justificativaC1Override ?? consolResult?.competencias?.c1?.justificativa ?? byComp.get("c1")!.justificativa },
        c2: { nota: notaC2, justificativa: consolResult?.competencias?.c2?.justificativa ?? byComp.get("c2")!.justificativa },
        c3: { nota: notaC3, justificativa: consolResult?.competencias?.c3?.justificativa ?? byComp.get("c3")!.justificativa },
        c4: { nota: notaC4, justificativa: consolResult?.competencias?.c4?.justificativa ?? byComp.get("c4")!.justificativa },
        c5: { nota: notaC5, justificativa: consolResult?.competencias?.c5?.justificativa ?? byComp.get("c5")!.justificativa },
      },
      nota_total: notaTotal,
      erros,
      estrutura: {
        ...(consolResult.estrutura ?? {
          possui_tese: false, tese_identificada: "", argumentos: [], uso_repertorio: "", proposta_intervencao: "",
        }),
        // Campo rico de C2 — vem do pipeline, não do consolidador
        estrutura_dissertativo_argumentativa:
          (byComp.get("c2")!.raw as C2Response).analise_c2?.estrutura_dissertativo_argumentativa ?? null,
      },
      versao_lapidada: consolResult.versao_lapidada ?? "",
      sugestoes_objetivas: consolResult.sugestoes_objetivas ?? [],
      orientacoes_selecionadas: consolResult.orientacoes_selecionadas ?? {},
      resumo_geral: consolResult.resumo_geral ?? "",
      // Análise rica V5 — disponível para futura interface, ignorada pelo frontend V4
      _pipeline: {
        versao: "v5",
        atendimento_tema: atendimentoTema ?? "desconhecido",
        analise: {
          c1: byComp.get("c1")!.raw as C1Response,
          c2: byComp.get("c2")!.raw as C2Response,
          c3: byComp.get("c3")!.raw as C3Response,
          c4: byComp.get("c4")!.raw as C4Response,
          c5: byComp.get("c5")!.raw as C5Response,
        },
        etapas: {
          c1: byComp.get("c1")!.etapa,
          c2: byComp.get("c2")!.etapa,
          c3: byComp.get("c3")!.etapa,
          c4: byComp.get("c4")!.etapa,
          c5: byComp.get("c5")!.etapa,
          consolidacao: { tokens_input: consolAI.tokens_input, tokens_output: consolAI.tokens_output, tempo_ms: tempoConsol },
        },
      },
    };

    // ══════════════════════════════════════════════════════════════
    // 9. TOKENS E CUSTO TOTAIS
    // ══════════════════════════════════════════════════════════════
    const totalInput = resultadosPipeline.reduce((s, r) => s + r.etapa.tokens_input, 0) + consolAI.tokens_input;
    const totalOutput = resultadosPipeline.reduce((s, r) => s + r.etapa.tokens_output, 0) + consolAI.tokens_output;
    const totalTokens = totalInput + totalOutput;
    const custoEstimado = calcularCusto(config.model, totalInput, totalOutput);
    const tempoTotal = Date.now() - pipelineStart;

    console.log(`📊 Nota: ${notaTotal}/1000 | Tokens: ${totalTokens} | Custo: $${custoEstimado.toFixed(4)} | Tempo: ${tempoTotal}ms`);

    // ══════════════════════════════════════════════════════════════
    // 10. SALVAR
    // ══════════════════════════════════════════════════════════════
    const { error: updateError } = await supabase
      .from("jarvis_correcoes")
      .update({
        transcricao_confirmada: transcricaoConfirmada,
        correcao_ia: correcaoIA,
        nota_total: notaTotal,
        nota_c1: notaC1,
        nota_c2: notaC2,
        nota_c3: notaC3,
        nota_c4: notaC4,
        nota_c5: notaC5,
        config_id: config.id,
        config_versao: config.versao,
        modelo_ia: `${config.model}:v5-pipeline`,
        tokens_input: totalInput,
        tokens_output: totalOutput,
        tokens_total: totalTokens,
        tempo_processamento_ms: tempoTotal,
        custo_estimado: custoEstimado,
        grupo_id: correcaoId,
        numero_versao: 1,
        is_versao_principal: true,
        tipo_correcao: "original",
        status: "corrigida",
        corrigida_em: new Date().toISOString(),
        atualizado_em: new Date().toISOString(),
      })
      .eq("id", cId);

    if (updateError) throw new Error("Erro ao salvar correção no banco de dados");
    console.log("✅ Correção V5 salva!");

    // Após sucesso no caminho admin: atualiza redacoes_enviadas com FK e status incompleto
    if (ehAdmin && correcao.redacao_enviada_id) {
      await supabase
        .from("redacoes_enviadas")
        .update({
          jarvis_precorrecao_id: correcaoId,
          status_corretor_1: "incompleta",
        })
        .eq("id", correcao.redacao_enviada_id)
        .is("jarvis_precorrecao_id", null); // idempotente: só atualiza se ainda não tiver

      // Inserir marcações de trecho geradas pelo Jarvis
      const marcacoesRaw: any[] = consolResult?.marcacoes_trecho ?? [];
      if (marcacoesRaw.length > 0) {
        const textoRedacao: string = correcao.transcricao_confirmada ?? transcricaoConfirmada ?? "";
        const rows = marcacoesRaw
          .filter((m: any) => m?.trecho && m?.competencia && m?.comentario)
          .slice(0, 20)
          .map((m: any) => {
            const loc = localizarTrecho(textoRedacao, m.trecho);
            if (!loc) return null;
            const paragrafo = m.paragrafo
              ? Number(m.paragrafo)
              : obterNumeroParagrafo(textoRedacao, m.trecho);
            return {
              redacao_enviada_id: correcao.redacao_enviada_id,
              jarvis_correcao_id: correcaoId,
              trecho: m.trecho,
              inicio: loc.inicio,
              fim: loc.fim,
              ocorrencia: loc.ocorrencia,
              contexto_anterior: loc.contexto_anterior,
              contexto_posterior: loc.contexto_posterior,
              paragrafo: isNaN(paragrafo) ? null : paragrafo,
              competencia: String(m.competencia).toLowerCase(),
              tipo: m.tipo ?? null,
              comentario: String(m.comentario).slice(0, 150),
              sugestao_reescrita: m.sugestao_reescrita ?? null,
              origem: "jarvis",
              status: "sugerida",
            };
          })
          .filter(Boolean);

        if (rows.length > 0) {
          const { error: marcacoesError } = await supabase
            .from("comentarios_trecho_correcao")
            .insert(rows);
          if (marcacoesError) {
            console.error("⚠️ Falha ao salvar marcações de trecho:", marcacoesError.message);
          } else {
            console.log(`✅ ${rows.length} marcações de trecho salvas`);
          }
        }
      }
    }

    const responsePayload: Record<string, unknown> = {
      success: true,
      correcaoId,
      pipeline: { versao: "v5", nota_total: notaTotal, tempo_ms: tempoTotal, tokens_total: totalTokens, custo_usd: custoEstimado },
    };

    // Créditos restantes só fazem sentido no caminho professor
    if (!ehAdmin && typeof creditResult !== "undefined") {
      responsePayload.creditos_restantes = (creditResult as any).creditos_atuais;
    }

    return new Response(
      JSON.stringify(responsePayload),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("❌ Erro V5:", error);
    if (correcaoId) {
      try {
        const supabase = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");
        await supabase.from("jarvis_correcoes")
          .update({ status: "erro", erro_mensagem: `[V5] ${error.message || "Erro desconhecido"}` })
          .eq("id", correcaoId);

        // Devolução de crédito só no caminho professor
        if (creditoConsumido && professorId) {
          const { error: refundErr } = await supabase.rpc("devolver_credito_professor", {
            professor_id_param: professorId,
            quantidade: custoCreditos,
            motivo: `[V5] Falha na correção ${correcaoId}: ${error.message ?? "Erro desconhecido"}`,
          });
          if (refundErr) {
            console.error("❌ Falha ao devolver crédito:", refundErr);
          } else {
            console.log(`💳 Crédito devolvido ao professor ${professorId}: ${custoCreditos}`);
          }
        }
      } catch { /* silencia */ }
    }
    return new Response(
      JSON.stringify({ error: error.message || "Erro ao processar correção V5" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
