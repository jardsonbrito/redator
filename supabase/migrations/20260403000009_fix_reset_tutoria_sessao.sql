-- ═══════════════════════════════════════════════════════════════
-- JARVIS - FIX: RESET TUTORIA SESSÃO
-- Migration: 20260403000009
-- Descrição: Corrige a função reset_tutoria_sessao para usar
--            JSONB correto em vez de strings
-- ═══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION reset_tutoria_sessao(p_sessao_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE jarvis_tutoria_sessoes
  SET
    etapa_atual = 'preenchimento',
    dados_preenchidos = '{}'::jsonb,
    dados_sugeridos = '{}'::jsonb,
    validacao_resultado = NULL,
    texto_gerado = NULL,
    engenharia_paragrafo = NULL,
    finalizado = false,
    creditos_consumidos = 0,
    atualizado_em = NOW()
  WHERE id = p_sessao_id;

  RETURN FOUND;
END;
$$;

COMMENT ON FUNCTION reset_tutoria_sessao IS
  'Reseta sessão para estado inicial (para fazer nova tutoria)';

-- ─── Fim da migration ───────────────────────────────────────────
