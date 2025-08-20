-- Criar função específica para correção de lousas que bypass RLS
CREATE OR REPLACE FUNCTION public.corrigir_lousa_resposta(
  resposta_id uuid,
  p_comentario_professor text,
  p_nota numeric,
  corretor_email text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Verificar se é admin ou corretor ativo
  IF NOT (
    public.is_main_admin() OR 
    EXISTS (
      SELECT 1 FROM public.corretores 
      WHERE email = corretor_email AND ativo = true
    )
  ) THEN
    RAISE EXCEPTION 'Acesso negado: apenas administradores ou corretores podem corrigir respostas';
  END IF;
  
  -- Atualizar resposta
  UPDATE public.lousa_resposta 
  SET 
    status = 'graded',
    nota = p_nota,
    comentario_professor = p_comentario_professor,
    corrected_at = now(),
    updated_at = now()
  WHERE id = resposta_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Resposta não encontrada';
  END IF;
  
  RETURN true;
END;
$$;