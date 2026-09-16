-- ═══════════════════════════════════════════════════════════════
-- JARVIS - INSERIR MODO TUTORIA E SUBTABS
-- Migration: 20260403000004
-- Descrição: Cria modo interativo "Tutoria" com 3 subtabs:
--            - Introdução (habilitada - MVP1)
--            - Desenvolvimento (bloqueada - futuro)
--            - Conclusão (bloqueada - futuro)
-- ═══════════════════════════════════════════════════════════════

-- ─── 1. Inserir modo Tutoria ────────────────────────────────────
INSERT INTO jarvis_modos (
  tipo_modo,
  nome,
  label,
  descricao,
  icone,
  system_prompt,
  campos_resposta,
  config_interativa,
  ativo,
  ordem
) VALUES (
  'interativo',
  'tutoria',
  'Tutoria',
  'Construção orientada de redação com mediação pedagógica',
  'GraduationCap',
  -- System prompt genérico (não será usado em modos interativos)
  'Modo interativo - prompts específicos em config_interativa',
  '[]'::jsonb,  -- Sem campos de resposta fixos (variam por subtab)
  jsonb_build_object(
    'prompts', jsonb_build_object(
      'sugestoes', 'Você é Jarvis, assistente pedagógico de redação ENEM.

O aluno está construindo uma introdução sobre o tema informado.

Com base nos campos já preenchidos pelo aluno, SUGIRA conteúdo pertinente para os campos deixados em branco.

IMPORTANTE:
- Não invente além do tema
- Seja conciso e específico
- Mantenha nível ENEM (formal, mas não rebuscado)
- Repertório deve ser verificável
- Contextualização deve mencionar Brasil

Retorne JSON com APENAS os campos vazios que você deve preencher.',

      'validacao', 'Você é um corretor pedagógico de redação ENEM.

Avalie a qualidade dos elementos fornecidos para uma introdução:

CRITÉRIOS:
- Repertório: pertinente? específico? produtivo?
- Interpretação: há análise real ou só citação?
- Contextualização: problematizada? menciona Brasil?
- Aspectos causais: desenvolvíveis? específicos? coerentes entre si?

Retorne JSON:
{
  "mensagem_geral": "Texto breve sobre qualidade geral",
  "avaliacoes_campo": [
    {
      "campo": "repertorio",
      "comentario": "...",
      "qualidade": "alta|media|baixa"
    },
    ...
  ]
}',

      'geracao', 'Você é Jarvis, assistente de redação ENEM.

Gere uma introdução de redação ENEM seguindo EXATAMENTE esta estrutura:

ESTRUTURA OBRIGATÓRIA:
1º período: Repertório sociocultural + interpretação
2º período: Contextualização problematizada no Brasil
3º período: Tese por causalidade com os dois aspectos

REGRAS:
- 3 períodos (não mais, não menos)
- Repertório e interpretação integrados no 1º período
- Contextualização brasileira e problematizada no 2º
- Tese causal explícita com os 2 aspectos no 3º
- Linguagem formal acadêmica (não rebuscada)
- Coesão adequada entre períodos

Retorne JSON:
{
  "introducao": "Texto completo da introdução (3 períodos)"
}'
    )
  ),
  true,  -- ativo
  (SELECT COALESCE(MAX(ordem), -1) + 1 FROM jarvis_modos)  -- última posição
)
ON CONFLICT (nome) DO NOTHING;

-- Verificar se modo foi inserido
DO $$
DECLARE
  v_modo_id UUID;
BEGIN
  SELECT id INTO v_modo_id
  FROM jarvis_modos
  WHERE nome = 'tutoria';

  IF v_modo_id IS NULL THEN
    RAISE EXCEPTION 'Erro: Modo Tutoria não foi inserido';
  END IF;

  RAISE NOTICE 'OK: Modo Tutoria inserido com ID: %', v_modo_id;
END $$;

-- ─── 2. Inserir subtab Introdução (habilitada) ──────────────────
INSERT INTO jarvis_tutoria_subtabs (
  modo_id,
  nome,
  label,
  ordem,
  habilitada,
  config
)
SELECT
  id,
  'introducao',
  'Introdução',
  0,
  true,  -- habilitada no MVP1
  jsonb_build_object(
    'instrucao_aluno', 'Preencha os elementos da introdução. Você pode deixar campos em branco: o Jarvis sugerirá conteúdo, que você poderá editar antes de continuar.',
    'campos', jsonb_build_array(
      jsonb_build_object(
        'nome', 'tema',
        'label', 'Tema da redação',
        'tipo', 'text',
        'placeholder', 'Digite o tema proposto'
      ),
      jsonb_build_object(
        'nome', 'repertorio',
        'label', 'Repertório Sociocultural',
        'tipo', 'textarea',
        'placeholder', 'Cite repertório pertinente (autor, obra, dado, conceito...)'
      ),
      jsonb_build_object(
        'nome', 'interpretacao',
        'label', 'Interpretação do Repertório',
        'tipo', 'textarea',
        'placeholder', 'Explique como o repertório se relaciona com o tema'
      ),
      jsonb_build_object(
        'nome', 'contextualizacao',
        'label', 'Contextualização no Brasil',
        'tipo', 'textarea',
        'placeholder', 'Como esse problema se manifesta no Brasil?'
      ),
      jsonb_build_object(
        'nome', 'aspecto_1',
        'label', 'Aspecto Causal 1',
        'tipo', 'text',
        'placeholder', 'Primeira causa do problema'
      ),
      jsonb_build_object(
        'nome', 'aspecto_2',
        'label', 'Aspecto Causal 2',
        'tipo', 'text',
        'placeholder', 'Segunda causa do problema'
      )
    ),
    'creditos_consumo', 3
  )
FROM jarvis_modos
WHERE nome = 'tutoria'
ON CONFLICT (modo_id, nome) DO NOTHING;

-- ─── 3. Inserir subtab Desenvolvimento (bloqueada) ──────────────
INSERT INTO jarvis_tutoria_subtabs (
  modo_id,
  nome,
  label,
  ordem,
  habilitada,
  config
)
SELECT
  id,
  'desenvolvimento',
  'Desenvolvimento',
  1,
  false,  -- bloqueada (futuro)
  jsonb_build_object(
    'instrucao_aluno', 'Funcionalidade em desenvolvimento',
    'campos', jsonb_build_array(),
    'creditos_consumo', 5
  )
FROM jarvis_modos
WHERE nome = 'tutoria'
ON CONFLICT (modo_id, nome) DO NOTHING;

-- ─── 4. Inserir subtab Conclusão (bloqueada) ────────────────────
INSERT INTO jarvis_tutoria_subtabs (
  modo_id,
  nome,
  label,
  ordem,
  habilitada,
  config
)
SELECT
  id,
  'conclusao',
  'Conclusão',
  2,
  false,  -- bloqueada (futuro)
  jsonb_build_object(
    'instrucao_aluno', 'Funcionalidade em desenvolvimento',
    'campos', jsonb_build_array(),
    'creditos_consumo', 3
  )
FROM jarvis_modos
WHERE nome = 'tutoria'
ON CONFLICT (modo_id, nome) DO NOTHING;

-- ─── 5. Verificar inserções ─────────────────────────────────────
DO $$
DECLARE
  v_subtabs_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_subtabs_count
  FROM jarvis_tutoria_subtabs
  WHERE modo_id IN (SELECT id FROM jarvis_modos WHERE nome = 'tutoria');

  IF v_subtabs_count != 3 THEN
    RAISE EXCEPTION 'Erro: Esperadas 3 subtabs, encontradas %', v_subtabs_count;
  END IF;

  RAISE NOTICE 'OK: 3 subtabs inseridas (Introdução habilitada, Desenvolvimento e Conclusão bloqueadas)';
END $$;

-- ─── Fim da migration ───────────────────────────────────────────
