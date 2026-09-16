-- Adiciona avatar_url à tabela de professores (reserva para uso futuro)
ALTER TABLE public.professores
  ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- RPC para atualizar avatar do professor via SECURITY DEFINER (reserva)
CREATE OR REPLACE FUNCTION public.atualizar_avatar_professor(
  p_professor_id UUID,
  p_avatar_url   TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM professores WHERE id = p_professor_id AND ativo = true
  ) THEN
    RETURN jsonb_build_object('success', false, 'message', 'Professor não encontrado ou inativo');
  END IF;

  UPDATE professores
  SET avatar_url = p_avatar_url,
      atualizado_em = now()
  WHERE id = p_professor_id;

  RETURN jsonb_build_object('success', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.atualizar_avatar_professor(UUID, TEXT) TO anon, authenticated;
