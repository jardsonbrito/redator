-- marcarComoLidaAluno usava .update() direto na tabela tentando marcar
-- mensagens com autor='corretor' como lidas, mas as políticas RLS de UPDATE
-- cobrem apenas autor='aluno'. O update era silenciosamente bloqueado,
-- lida ficava false e o badge nunca desaparecia para o aluno.
-- Solução: RPC SECURITY DEFINER que executa como postgres.

CREATE OR REPLACE FUNCTION public.marcar_mensagens_lidas_aluno(
  p_aluno_email  TEXT,
  p_corretor_id  UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_aluno_id UUID;
BEGIN
  SELECT id INTO v_aluno_id
  FROM public.profiles
  WHERE email = LOWER(TRIM(p_aluno_email))
    AND user_type = 'aluno'
  LIMIT 1;

  IF v_aluno_id IS NULL THEN
    RETURN;
  END IF;

  UPDATE public.ajuda_rapida_mensagens
  SET lida = true
  WHERE aluno_id   = v_aluno_id
    AND corretor_id = p_corretor_id
    AND autor       = 'corretor'
    AND lida        = false;
END;
$$;

GRANT EXECUTE ON FUNCTION public.marcar_mensagens_lidas_aluno(TEXT, UUID) TO authenticated, anon;
