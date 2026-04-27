-- Fix: remover políticas de DELETE que dependem de Supabase Auth (não usado por professores)
-- e criar RPCs com SECURITY DEFINER que verificam ownership pelo email.

DROP POLICY IF EXISTS "Admins deletam correções" ON jarvis_correcoes;
DROP POLICY IF EXISTS "Professores deletam suas correções" ON jarvis_correcoes;

-- RPC: deletar uma correção individual (ownership verificado por email)
CREATE OR REPLACE FUNCTION deletar_jarvis_correcao(
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
  v_dono_id UUID;
BEGIN
  SELECT id INTO v_professor_id FROM professores WHERE email = p_professor_email;
  IF v_professor_id IS NULL THEN
    RAISE EXCEPTION 'Professor não encontrado';
  END IF;

  SELECT professor_id INTO v_dono_id FROM jarvis_correcoes WHERE id = p_correcao_id;
  IF v_dono_id IS NULL OR v_dono_id != v_professor_id THEN
    RAISE EXCEPTION 'Acesso negado ou correção não encontrada';
  END IF;

  DELETE FROM jarvis_correcoes WHERE id = p_correcao_id;
  RETURN TRUE;
END;
$$;

-- RPC: deletar todas as correções de um aluno (ownership verificado por email)
CREATE OR REPLACE FUNCTION deletar_jarvis_correcoes_aluno(
  p_autor_nome TEXT,
  p_professor_email TEXT
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_professor_id UUID;
  v_count INTEGER;
BEGIN
  SELECT id INTO v_professor_id FROM professores WHERE email = p_professor_email;
  IF v_professor_id IS NULL THEN
    RAISE EXCEPTION 'Professor não encontrado';
  END IF;

  DELETE FROM jarvis_correcoes
  WHERE professor_id = v_professor_id AND autor_nome = p_autor_nome;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;
