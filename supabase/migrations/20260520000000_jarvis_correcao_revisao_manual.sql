-- Fix: professores não usam Supabase Auth, então UPDATE e INSERT diretos são bloqueados por RLS.
-- Solução: RPCs com SECURITY DEFINER que verificam ownership pelo email.

-- ─────────────────────────────────────────────────────────────────
-- 1. RPC: salvar revisão manual da correção pelo professor
-- ─────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION salvar_jarvis_correcao_revisada(
  p_correcao_id UUID,
  p_professor_email TEXT,
  p_nota_c1 INTEGER,
  p_nota_c2 INTEGER,
  p_nota_c3 INTEGER,
  p_nota_c4 INTEGER,
  p_nota_c5 INTEGER,
  p_correcao_ia JSONB
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_professor_id UUID;
  v_dono_id UUID;
  v_nota_total INTEGER;
BEGIN
  SELECT id INTO v_professor_id FROM professores WHERE email = p_professor_email;
  IF v_professor_id IS NULL THEN
    RAISE EXCEPTION 'Professor não encontrado';
  END IF;

  SELECT professor_id INTO v_dono_id FROM jarvis_correcoes WHERE id = p_correcao_id;
  IF v_dono_id IS NULL OR v_dono_id != v_professor_id THEN
    RAISE EXCEPTION 'Acesso negado ou correção não encontrada';
  END IF;

  v_nota_total := p_nota_c1 + p_nota_c2 + p_nota_c3 + p_nota_c4 + p_nota_c5;

  UPDATE jarvis_correcoes
  SET
    nota_total = v_nota_total,
    nota_c1 = p_nota_c1,
    nota_c2 = p_nota_c2,
    nota_c3 = p_nota_c3,
    nota_c4 = p_nota_c4,
    nota_c5 = p_nota_c5,
    correcao_ia = p_correcao_ia
  WHERE id = p_correcao_id;

  RETURN TRUE;
END;
$$;

-- ─────────────────────────────────────────────────────────────────
-- 2. RPC: salvar correção como modelo de referência do Jarvis
-- ─────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION salvar_jarvis_modelo_referencia(
  p_professor_email TEXT,
  p_titulo TEXT,
  p_tema TEXT,
  p_texto_aluno TEXT,
  p_nota_total INTEGER,
  p_nota_c1 INTEGER,
  p_nota_c2 INTEGER,
  p_nota_c3 INTEGER,
  p_nota_c4 INTEGER,
  p_nota_c5 INTEGER,
  p_justificativa_c1 TEXT DEFAULT NULL,
  p_justificativa_c2 TEXT DEFAULT NULL,
  p_justificativa_c3 TEXT DEFAULT NULL,
  p_justificativa_c4 TEXT DEFAULT NULL,
  p_justificativa_c5 TEXT DEFAULT NULL,
  p_erros_identificados TEXT DEFAULT NULL,
  p_sugestoes_melhoria TEXT DEFAULT NULL,
  p_comentario_pedagogico TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_professor_id UUID;
  v_novo_id UUID;
BEGIN
  SELECT id INTO v_professor_id FROM professores WHERE email = p_professor_email;
  IF v_professor_id IS NULL THEN
    RAISE EXCEPTION 'Professor não encontrado';
  END IF;

  INSERT INTO jarvis_correcao_modelos_referencia (
    titulo, tema, texto_aluno,
    nota_total, nota_c1, nota_c2, nota_c3, nota_c4, nota_c5,
    justificativa_c1, justificativa_c2, justificativa_c3, justificativa_c4, justificativa_c5,
    erros_identificados, sugestoes_melhoria, comentario_pedagogico,
    ativo
  ) VALUES (
    p_titulo, p_tema, p_texto_aluno,
    p_nota_total, p_nota_c1, p_nota_c2, p_nota_c3, p_nota_c4, p_nota_c5,
    p_justificativa_c1, p_justificativa_c2, p_justificativa_c3, p_justificativa_c4, p_justificativa_c5,
    p_erros_identificados, p_sugestoes_melhoria, p_comentario_pedagogico,
    true
  )
  RETURNING id INTO v_novo_id;

  RETURN v_novo_id;
END;
$$;
