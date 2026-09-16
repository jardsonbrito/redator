-- ═══════════════════════════════════════════════════════════════
-- JARVIS ADMIN — Pré-correção manual de redações digitadas
-- Migration: 20260518000000
-- ═══════════════════════════════════════════════════════════════

-- ─── 1. Tornar professor_id nullable ─────────────────────────────
-- Necessário para rows originadas pelo admin (sem vínculo com professor)
ALTER TABLE public.jarvis_correcoes
  ALTER COLUMN professor_id DROP NOT NULL;

-- ─── 2. Novos campos em jarvis_correcoes ─────────────────────────
ALTER TABLE public.jarvis_correcoes
  ADD COLUMN IF NOT EXISTS admin_id UUID
    REFERENCES public.admin_users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS redacao_enviada_id UUID
    REFERENCES public.redacoes_enviadas(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS is_pre_correcao BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS origem_tipo TEXT NOT NULL DEFAULT 'professor'
    CHECK (origem_tipo IN ('professor', 'admin'));

-- Constraint: toda row deve ter exatamente uma origem declarada
ALTER TABLE public.jarvis_correcoes
  ADD CONSTRAINT chk_jarvis_origem_consistente CHECK (
    (origem_tipo = 'professor' AND professor_id IS NOT NULL AND admin_id IS NULL)
    OR
    (origem_tipo = 'admin'    AND admin_id    IS NOT NULL AND professor_id IS NULL)
  );

-- Índices para lookup eficiente de pré-correção
CREATE INDEX IF NOT EXISTS idx_jarvis_correcoes_redacao_enviada
  ON public.jarvis_correcoes(redacao_enviada_id)
  WHERE redacao_enviada_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_jarvis_correcoes_pre_correcao_ativa
  ON public.jarvis_correcoes(redacao_enviada_id, status)
  WHERE is_pre_correcao = true;

-- ─── 3. Campo reverso em redacoes_enviadas ───────────────────────
ALTER TABLE public.redacoes_enviadas
  ADD COLUMN IF NOT EXISTS jarvis_precorrecao_id UUID
    REFERENCES public.jarvis_correcoes(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_redacoes_enviadas_jarvis_precorrecao
  ON public.redacoes_enviadas(jarvis_precorrecao_id)
  WHERE jarvis_precorrecao_id IS NOT NULL;

-- ─── 4. Corrigir mensagem em deletar_jarvis_correcao ─────────────
-- Antes: "Acesso negado" quando professor_id era NULL (row admin)
-- Agora: mensagem específica por caso
CREATE OR REPLACE FUNCTION public.deletar_jarvis_correcao(
  p_correcao_id UUID,
  p_professor_email TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_professor_id UUID;
  v_dono_id      UUID;
  v_origem       TEXT;
BEGIN
  SELECT id INTO v_professor_id FROM professores WHERE email = p_professor_email;
  IF v_professor_id IS NULL THEN
    RAISE EXCEPTION 'Professor não encontrado';
  END IF;

  SELECT professor_id, origem_tipo INTO v_dono_id, v_origem
  FROM jarvis_correcoes WHERE id = p_correcao_id;

  IF v_origem = 'admin' THEN
    RAISE EXCEPTION 'Correção gerada pelo admin não pode ser excluída por professor';
  END IF;

  IF v_dono_id IS NULL OR v_dono_id != v_professor_id THEN
    RAISE EXCEPTION 'Correção não encontrada ou não pertence ao professor';
  END IF;

  DELETE FROM jarvis_correcoes WHERE id = p_correcao_id;
  RETURN TRUE;
END;
$$;

-- ─── 5. Atualizar admin_get_jarvis_correcoes_geral ───────────────
-- Inclui origin_tipo, is_pre_correcao e redacao_enviada_id nos retornos.
-- LEFT JOIN com professores continua funcionando mesmo com professor_id NULL.
CREATE OR REPLACE FUNCTION public.admin_get_jarvis_correcoes_geral(
  p_limit  INTEGER DEFAULT 500,
  p_offset INTEGER DEFAULT 0
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_admin BOOLEAN;
  v_result   JSONB;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM public.admin_users
    WHERE admin_users.id    = auth.uid()
       OR admin_users.email = auth.email()
  ) INTO v_is_admin;

  IF NOT v_is_admin THEN
    RAISE EXCEPTION 'Acesso negado: usuário não é administrador';
  END IF;

  SELECT COALESCE(jsonb_agg(row_to_json(r.*) ORDER BY r.criado_em DESC), '[]'::jsonb)
  INTO v_result
  FROM (
    SELECT
      jc.id,
      jc.professor_id,
      jc.admin_id,
      jc.redacao_enviada_id,
      jc.origem_tipo,
      jc.is_pre_correcao,
      jc.turma_id,
      jc.autor_nome,
      jc.tema,
      jc.imagem_url,
      jc.status,
      jc.nota_total,
      jc.nota_c1, jc.nota_c2, jc.nota_c3, jc.nota_c4, jc.nota_c5,
      jc.criado_em,
      jc.corrigida_em,
      jc.is_versao_principal,
      jc.numero_versao,
      jc.grupo_id,
      jc.tipo_correcao,
      jc.correcao_ia,
      jc.transcricao_confirmada,
      jc.transcricao_ocr_original,
      jc.redacao_comentada_id,
      -- NULL para rows admin (LEFT JOIN retorna null automaticamente)
      p.nome  AS professor_nome,
      p.email AS professor_email
    FROM public.jarvis_correcoes jc
    LEFT JOIN public.professores p ON p.id = jc.professor_id
    WHERE jc.is_versao_principal = true
    ORDER BY jc.criado_em DESC
    LIMIT  p_limit
    OFFSET p_offset
  ) r;

  RETURN v_result;
END;
$$;

-- ─── 6. Atualizar get_redacoes_corretor_detalhadas ───────────────
-- Adiciona jarvis_precorrecao_id e jarvis_precorrecao_status.
-- Apenas redacoes_enviadas (regular) pode ter pré-correção; simulado/exercício retornam NULL.
DROP FUNCTION IF EXISTS public.get_redacoes_corretor_detalhadas(text);

CREATE OR REPLACE FUNCTION public.get_redacoes_corretor_detalhadas(corretor_email text)
RETURNS TABLE(
  id                        uuid,
  tipo_redacao              text,
  nome_aluno                text,
  email_aluno               text,
  frase_tematica            text,
  data_envio                timestamp with time zone,
  texto                     text,
  status_minha_correcao     text,
  eh_corretor_1             boolean,
  eh_corretor_2             boolean,
  redacao_manuscrita_url    text,
  redacao_imagem_gerada_url text,
  corretor_id_1             uuid,
  corretor_id_2             uuid,
  turma                     text,
  exercicio_tipo            text,
  corrigida                 boolean,
  congelada                 boolean,
  data_descongelamento      text,
  jarvis_precorrecao_id     uuid,
  jarvis_precorrecao_status text
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO ''
AS $function$
  WITH corretor_info AS (
    SELECT c.id, c.email, c.ativo
    FROM public.corretores c
    WHERE c.email = corretor_email AND c.ativo = true
    LIMIT 1
  )

  SELECT
    r.id,
    'regular'::text                                         AS tipo_redacao,
    COALESCE(p.nome, r.nome_aluno, 'Aluno')                AS nome_aluno,
    r.email_aluno,
    r.frase_tematica,
    r.data_envio,
    r.redacao_texto                                        AS texto,
    CASE
      WHEN r.corretor_id_1 = ci.id THEN COALESCE(r.status_corretor_1, 'pendente')
      WHEN r.corretor_id_2 = ci.id THEN COALESCE(r.status_corretor_2, 'pendente')
      ELSE 'pendente'
    END::text                                              AS status_minha_correcao,
    (r.corretor_id_1 = ci.id)                             AS eh_corretor_1,
    (r.corretor_id_2 = ci.id)                             AS eh_corretor_2,
    r.redacao_manuscrita_url,
    r.redacao_imagem_gerada_url,
    r.corretor_id_1,
    r.corretor_id_2,
    r.turma,
    NULL::text                                            AS exercicio_tipo,
    COALESCE(r.corrigida, false)                          AS corrigida,
    COALESCE(r.congelada, false)                          AS congelada,
    r.data_descongelamento::text                          AS data_descongelamento,
    r.jarvis_precorrecao_id,
    jc.status                                             AS jarvis_precorrecao_status
  FROM public.redacoes_enviadas r
  CROSS JOIN corretor_info ci
  LEFT JOIN public.profiles p
    ON LOWER(TRIM(p.email)) = LOWER(TRIM(r.email_aluno)) AND p.user_type = 'aluno'
  LEFT JOIN public.jarvis_correcoes jc
    ON jc.id = r.jarvis_precorrecao_id
  WHERE (r.corretor_id_1 = ci.id OR r.corretor_id_2 = ci.id)
    AND r.deleted_at IS NULL

  UNION ALL

  SELECT
    rs.id,
    'simulado'::text                                       AS tipo_redacao,
    COALESCE(p.nome, rs.nome_aluno, 'Aluno')              AS nome_aluno,
    rs.email_aluno,
    s.frase_tematica,
    rs.data_envio,
    rs.texto,
    CASE
      WHEN rs.corretor_id_1 = ci.id THEN COALESCE(rs.status_corretor_1, 'pendente')
      WHEN rs.corretor_id_2 = ci.id THEN COALESCE(rs.status_corretor_2, 'pendente')
      ELSE 'pendente'
    END::text                                              AS status_minha_correcao,
    (rs.corretor_id_1 = ci.id)                            AS eh_corretor_1,
    (rs.corretor_id_2 = ci.id)                            AS eh_corretor_2,
    rs.redacao_manuscrita_url,
    rs.redacao_imagem_gerada_url,
    rs.corretor_id_1,
    rs.corretor_id_2,
    rs.turma,
    NULL::text                                            AS exercicio_tipo,
    COALESCE(rs.corrigida, false)                         AS corrigida,
    NULL::boolean                                         AS congelada,
    NULL::text                                            AS data_descongelamento,
    NULL::uuid                                            AS jarvis_precorrecao_id,
    NULL::text                                            AS jarvis_precorrecao_status
  FROM public.redacoes_simulado rs
  JOIN public.simulados s ON rs.id_simulado = s.id
  CROSS JOIN corretor_info ci
  LEFT JOIN public.profiles p
    ON LOWER(TRIM(p.email)) = LOWER(TRIM(rs.email_aluno)) AND p.user_type = 'aluno'
  WHERE (rs.corretor_id_1 = ci.id OR rs.corretor_id_2 = ci.id)
    AND rs.deleted_at IS NULL

  UNION ALL

  SELECT
    re.id,
    'exercicio'::text                                      AS tipo_redacao,
    COALESCE(p.nome, re.nome_aluno, 'Aluno')              AS nome_aluno,
    re.email_aluno,
    e.titulo                                              AS frase_tematica,
    re.data_envio,
    re.redacao_texto                                      AS texto,
    CASE
      WHEN re.corretor_id_1 = ci.id THEN COALESCE(re.status_corretor_1, 'pendente')
      WHEN re.corretor_id_2 = ci.id THEN COALESCE(re.status_corretor_2, 'pendente')
      ELSE 'pendente'
    END::text                                              AS status_minha_correcao,
    (re.corretor_id_1 = ci.id)                            AS eh_corretor_1,
    (re.corretor_id_2 = ci.id)                            AS eh_corretor_2,
    re.redacao_manuscrita_url,
    re.redacao_imagem_gerada_url,
    re.corretor_id_1,
    re.corretor_id_2,
    re.turma,
    e.tipo                                                AS exercicio_tipo,
    COALESCE(re.corrigida, false)                         AS corrigida,
    NULL::boolean                                         AS congelada,
    NULL::text                                            AS data_descongelamento,
    NULL::uuid                                            AS jarvis_precorrecao_id,
    NULL::text                                            AS jarvis_precorrecao_status
  FROM public.redacoes_exercicio re
  JOIN public.exercicios e ON re.exercicio_id = e.id
  CROSS JOIN corretor_info ci
  LEFT JOIN public.profiles p
    ON LOWER(TRIM(p.email)) = LOWER(TRIM(re.email_aluno)) AND p.user_type = 'aluno'
  WHERE (re.corretor_id_1 = ci.id OR re.corretor_id_2 = ci.id)
    AND re.deleted_at IS NULL

  ORDER BY data_envio DESC;
$function$;

COMMENT ON FUNCTION public.get_redacoes_corretor_detalhadas(text) IS
  'Retorna todas as redações atribuídas ao corretor. '
  'Inclui jarvis_precorrecao_id e jarvis_precorrecao_status para exibir sugestão do Jarvis. '
  'Apenas redacoes_enviadas regulares suportam pré-correção; simulado/exercício retornam NULL.';
