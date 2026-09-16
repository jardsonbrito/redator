-- ═══════════════════════════════════════════════════════════════
-- VIEW: jarvis_uso_unificado
-- Migration: 20260624000001
-- Descrição: Unifica sessões do Tutor Jarvis e interações legadas
--            dos modos simples em uma única visão somente leitura
--            para o painel administrativo.
--
-- Origens:
--   'sessao_tutor'     → jarvis_sessoes_sintetizadas
--   'interacao_legada' → jarvis_interactions
--
-- Regras de delete: a view NÃO é alvo de operações DML.
-- Todo delete deve apontar explicitamente para a tabela de origem.
-- ═══════════════════════════════════════════════════════════════

CREATE OR REPLACE VIEW jarvis_uso_unificado AS

-- ── Bloco 1: Sessões do Tutor Jarvis ────────────────────────────
-- Sínteses pedagógicas geradas ao fim de uma conversa conversacional.
-- Campos pedagógicos ricos: resumo, habilidades, dificuldades, tags.
-- deleted_by_aluno incluído para que o admin veja todos os registros
-- (a flag significa apenas ocultação no app do aluno, não exclusão).
SELECT
  s.id,
  'sessao_tutor'::text                                          AS origem,
  s.aluno_id                                                    AS user_id,

  -- E-mail normalizado: preferência pelo valor já normalizado em profiles;
  -- fallback para o campo denormalizado da tabela (pode ter capitalização original)
  COALESCE(
    LOWER(TRIM(p.email)),
    LOWER(TRIM(s.aluno_email))
  )                                                             AS aluno_email,

  -- Nome: preferência pelo profiles atual (evita desatualização do campo denorm.)
  COALESCE(
    NULLIF(TRIM(CONCAT(p.nome, ' ', p.sobrenome)), ''),
    s.aluno_nome
  )                                                             AS aluno_nome,

  s.turma,
  s.subtab_nome                                                 AS assunto_ou_modo,
  s.created_at,
  s.deleted_by_aluno,

  -- Campos exclusivos de sessão Tutor
  s.resumo,
  s.pontos_positivos,
  s.dificuldades,
  s.tags_dificuldades,
  s.proximos_passos,
  s.orientacao_professor,
  s.habilidades,
  s.duracao_minutos,
  s.total_mensagens,
  s.avaliacao_aluno,
  s.conversa_id,

  -- Campos exclusivos de interação legada (NULL neste bloco)
  NULL::text                                                    AS texto_original,
  NULL::text                                                    AS diagnostico,
  NULL::text                                                    AS versao_melhorada,
  NULL::integer                                                 AS palavras_original,
  NULL::integer                                                 AS creditos_consumidos

FROM jarvis_sessoes_sintetizadas s
-- LEFT JOIN: mantém sessões cujo aluno_id seja NULL (registros muito antigos)
LEFT JOIN profiles p ON p.id = s.aluno_id

UNION ALL

-- ── Bloco 2: Interações Legadas dos Modos Simples ───────────────
-- Registros atômicos de uso dos modos Jarvis (análise, lapidação etc.)
-- gerados antes do Tutor Jarvis conversacional existir, ou por usuários
-- que ainda usam os modos simples diretamente.
-- Não possuem síntese pedagógica, apenas diagnóstico técnico da IA.
SELECT
  i.id,
  'interacao_legada'::text                                      AS origem,
  i.user_id,
  LOWER(TRIM(p.email))                                          AS aluno_email,
  NULLIF(TRIM(CONCAT(p.nome, ' ', p.sobrenome)), '')            AS aluno_nome,
  p.turma,
  m.label                                                       AS assunto_ou_modo,
  i.created_at,
  false::boolean                                                AS deleted_by_aluno,

  -- Campos exclusivos de sessão Tutor (NULL neste bloco)
  NULL::text                                                    AS resumo,
  NULL::text                                                    AS pontos_positivos,
  NULL::text[]                                                  AS dificuldades,
  NULL::text[]                                                  AS tags_dificuldades,
  NULL::text[]                                                  AS proximos_passos,
  NULL::text                                                    AS orientacao_professor,
  NULL::jsonb                                                   AS habilidades,
  NULL::integer                                                 AS duracao_minutos,
  NULL::integer                                                 AS total_mensagens,
  NULL::integer                                                 AS avaliacao_aluno,
  NULL::uuid                                                    AS conversa_id,

  -- Campos exclusivos de interação legada
  i.texto_original,
  i.diagnostico,
  i.versao_melhorada,
  i.palavras_original,
  i.creditos_consumidos

FROM jarvis_interactions i
JOIN profiles p ON p.id = i.user_id
LEFT JOIN jarvis_modos m ON m.id = i.modo_id;

-- ─── Comentário ─────────────────────────────────────────────────
COMMENT ON VIEW jarvis_uso_unificado IS
  'Visão somente leitura que unifica sessões do Tutor Jarvis (jarvis_sessoes_sintetizadas) '
  'e interações legadas dos modos simples (jarvis_interactions). '
  'Campo origem discrimina os dois tipos. '
  'Deletes DEVEM apontar para as tabelas de origem, nunca para esta view.';

-- ─── Fim da migration ───────────────────────────────────────────
