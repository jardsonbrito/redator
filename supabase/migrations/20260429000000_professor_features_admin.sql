-- ============================================================
-- Sistema de funcionalidades dinâmicas para professores
-- Data: 2026-04-29
-- Objetivo: Permitir que o admin gerencie quais cards aparecem
-- no dashboard do professor, sem lógica de plano.
-- Estratégia: aditiva — usa as colunas ordem_professor e
-- habilitado_professor já existentes em funcionalidades.
-- ============================================================

BEGIN;

-- ============================================================
-- 1. COLUNAS (idempotentes)
-- ============================================================

ALTER TABLE public.funcionalidades
  ADD COLUMN IF NOT EXISTS ordem_professor INTEGER;

ALTER TABLE public.funcionalidades
  ADD COLUMN IF NOT EXISTS habilitado_professor BOOLEAN NOT NULL DEFAULT false;

-- ============================================================
-- 2. SEED: configurar funcionalidades para professores
-- Apenas atualiza linhas onde ainda não foi definido.
-- ============================================================

DO $$
BEGIN
  -- Funcionalidades habilitadas por padrão para professores
  UPDATE public.funcionalidades SET
    ordem_professor     = COALESCE(ordem_professor, 1),
    habilitado_professor = true
  WHERE chave = 'temas' AND ordem_professor IS NULL;

  UPDATE public.funcionalidades SET
    ordem_professor     = COALESCE(ordem_professor, 2),
    habilitado_professor = true
  WHERE chave = 'guia_tematico' AND ordem_professor IS NULL;

  UPDATE public.funcionalidades SET
    ordem_professor     = COALESCE(ordem_professor, 3),
    habilitado_professor = true
  WHERE chave = 'repertorio_orientado' AND ordem_professor IS NULL;

  UPDATE public.funcionalidades SET
    ordem_professor     = COALESCE(ordem_professor, 4),
    habilitado_professor = true
  WHERE chave = 'redacoes_exemplares' AND ordem_professor IS NULL;

  UPDATE public.funcionalidades SET
    ordem_professor     = COALESCE(ordem_professor, 5),
    habilitado_professor = true
  WHERE chave = 'aulas_gravadas' AND ordem_professor IS NULL;

  UPDATE public.funcionalidades SET
    ordem_professor     = COALESCE(ordem_professor, 6),
    habilitado_professor = true
  WHERE chave = 'aulas_ao_vivo' AND ordem_professor IS NULL;

  UPDATE public.funcionalidades SET
    ordem_professor     = COALESCE(ordem_professor, 7),
    habilitado_professor = true
  WHERE chave = 'biblioteca' AND ordem_professor IS NULL;

  UPDATE public.funcionalidades SET
    ordem_professor     = COALESCE(ordem_professor, 8),
    habilitado_professor = true
  WHERE chave = 'videoteca' AND ordem_professor IS NULL;

  UPDATE public.funcionalidades SET
    ordem_professor     = COALESCE(ordem_professor, 9),
    habilitado_professor = true
  WHERE chave = 'diario_online' AND ordem_professor IS NULL;

  UPDATE public.funcionalidades SET
    ordem_professor     = COALESCE(ordem_professor, 10),
    habilitado_professor = true
  WHERE chave = 'top_5' AND ordem_professor IS NULL;

  UPDATE public.funcionalidades SET
    ordem_professor     = COALESCE(ordem_professor, 11),
    habilitado_professor = true
  WHERE chave = 'gamificacao' AND ordem_professor IS NULL;
END;
$$;

-- Jarvis Correção: exclusivo para professores (upsert)
INSERT INTO public.funcionalidades
  (chave, nome_exibicao, descricao, sempre_disponivel, ordem_aluno, ordem_professor, habilitado_professor, ativo)
VALUES
  ('jarvis_correcao', 'Jarvis - Correção IA',
   'Correção de redações com inteligência artificial para professores',
   false, 999, 12, true, true)
ON CONFLICT (chave) DO UPDATE SET
  ordem_professor      = COALESCE(public.funcionalidades.ordem_professor, EXCLUDED.ordem_professor),
  habilitado_professor = true,
  ativo                = true;

-- ============================================================
-- 3. ÍNDICE
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_funcionalidades_ordem_professor
  ON public.funcionalidades(ordem_professor);

-- ============================================================
-- 4. RPCs
-- ============================================================

-- Toggle de uma funcionalidade para professor (salva imediatamente)
CREATE OR REPLACE FUNCTION public.toggle_professor_feature(
  p_chave      TEXT,
  p_habilitado BOOLEAN
)
RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_next_ordem INTEGER;
BEGIN
  IF p_habilitado THEN
    -- Se habilitando e não tem ordem, coloca no final
    SELECT COALESCE(MAX(ordem_professor), 0) + 1
    INTO v_next_ordem
    FROM public.funcionalidades
    WHERE habilitado_professor = true;

    UPDATE public.funcionalidades
    SET habilitado_professor = true,
        ordem_professor      = COALESCE(ordem_professor, v_next_ordem)
    WHERE chave = p_chave;
  ELSE
    UPDATE public.funcionalidades
    SET habilitado_professor = false
    WHERE chave = p_chave;
  END IF;

  RETURN FOUND;
EXCEPTION WHEN OTHERS THEN
  RETURN FALSE;
END;
$$;

-- Reordenar funcionalidades do professor via drag-and-drop
CREATE OR REPLACE FUNCTION public.reorder_professor_funcionalidades(
  p_ordered_ids UUID[]
)
RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  i INT;
BEGIN
  FOR i IN 1..array_length(p_ordered_ids, 1)
  LOOP
    UPDATE public.funcionalidades
    SET ordem_professor = i
    WHERE id = p_ordered_ids[i];
  END LOOP;

  RETURN TRUE;
EXCEPTION WHEN OTHERS THEN
  RETURN FALSE;
END;
$$;

-- ============================================================
-- 5. GRANTS
-- ============================================================

GRANT EXECUTE ON FUNCTION public.toggle_professor_feature(TEXT, BOOLEAN)
  TO authenticated, service_role;

GRANT EXECUTE ON FUNCTION public.reorder_professor_funcionalidades(UUID[])
  TO authenticated, service_role;

COMMIT;
