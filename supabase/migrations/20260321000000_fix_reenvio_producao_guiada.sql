-- Função SECURITY DEFINER para reenvio seguro de Produção Guiada.
-- Problema: a tabela redacoes_exercicio tem política RLS de INSERT para anon
-- mas NÃO tem política UPDATE para anon. Isso fazia o .update() do aluno
-- falhar silenciosamente (0 rows, sem erro), travando no estado "Devolvida — Ciente".
--
-- Esta função bypassa RLS mas valida:
--   1. ownership: email_aluno deve bater com p_email_aluno
--   2. status atual deve ser 'devolvida' (só pode reenviar se foi devolvida)
--
-- Também limpa o registro em redacao_devolucao_visualizacoes para que uma
-- eventual segunda devolução mostre o botão "Entendi" novamente ao aluno.

CREATE OR REPLACE FUNCTION public.reenviar_atividade_producao_guiada(
  p_redacao_id   UUID,
  p_email_aluno  TEXT,
  p_novo_texto   TEXT
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  -- Atualizar somente se a redação pertence ao aluno E está no status 'devolvida'
  UPDATE public.redacoes_exercicio
  SET
    redacao_texto      = p_novo_texto,
    status_corretor_1  = 'reenviado',
    corrigida          = false,
    nota_total         = NULL,
    data_correcao      = NULL,
    motivo_devolucao   = NULL,
    data_envio         = now()
  WHERE id                             = p_redacao_id
    AND LOWER(TRIM(email_aluno))       = LOWER(TRIM(p_email_aluno))
    AND status_corretor_1              = 'devolvida';

  GET DIAGNOSTICS v_count = ROW_COUNT;

  IF v_count = 0 THEN
    RETURN FALSE;
  END IF;

  -- Limpar registro de visualização para que uma eventual segunda devolução
  -- mostre o botão "Entendi" novamente, sem herdar a ciência anterior.
  DELETE FROM public.redacao_devolucao_visualizacoes
  WHERE redacao_id      = p_redacao_id
    AND tabela_origem   = 'redacoes_exercicio'
    AND LOWER(TRIM(email_aluno)) = LOWER(TRIM(p_email_aluno));

  RETURN TRUE;
END;
$$;

-- Garantir que anon (alunos sem Supabase Auth) possam chamar a função
GRANT EXECUTE ON FUNCTION public.reenviar_atividade_producao_guiada(UUID, TEXT, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.reenviar_atividade_producao_guiada(UUID, TEXT, TEXT) TO authenticated;
