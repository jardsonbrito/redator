-- ═══════════════════════════════════════════════════════════════
-- FIX: admin_get_jarvis_correcoes_geral — p.nome → p.nome_completo
-- Migration: 20260624000002
-- Causa: tabela professores usa nome_completo, não nome
-- ═══════════════════════════════════════════════════════════════

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
      p.nome_completo AS professor_nome,
      p.email         AS professor_email
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
