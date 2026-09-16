-- Fix: Corrigir função verificar_redacao_pendente_corretor
-- 1. Ignorar redações canceladas (deleted_at IS NOT NULL)
-- 2. Separar verificação por tipo de envio (regular vs simulado)
-- 3. Incluir verificação na tabela redacoes_simulado

CREATE OR REPLACE FUNCTION verificar_redacao_pendente_corretor(
  p_email_aluno TEXT,
  p_corretor_id UUID,
  p_tipo_envio TEXT DEFAULT NULL
)
RETURNS TABLE(tem_pendente BOOLEAN, redacao_id UUID, tema TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Se o tipo de envio é simulado, verificar apenas na tabela de simulados
  IF p_tipo_envio = 'simulado' THEN
    RETURN QUERY
    SELECT
      true as tem_pendente,
      rs.id as redacao_id,
      COALESCE(s.frase_tematica, s.titulo, 'Simulado') as tema
    FROM redacoes_simulado rs
    LEFT JOIN simulados s ON s.id = rs.id_simulado
    WHERE
      LOWER(TRIM(rs.email_aluno)) = LOWER(TRIM(p_email_aluno))
      AND (rs.corretor_id_1 = p_corretor_id OR rs.corretor_id_2 = p_corretor_id)
      AND rs.corrigida = false
      AND rs.deleted_at IS NULL
    LIMIT 1;
  ELSE
    -- Para todos os outros tipos (regular, exercicio, processo_seletivo, etc),
    -- verificar apenas na tabela redacoes_enviadas
    RETURN QUERY
    SELECT
      true as tem_pendente,
      r.id as redacao_id,
      r.frase_tematica as tema
    FROM redacoes_enviadas r
    WHERE
      LOWER(TRIM(r.email_aluno)) = LOWER(TRIM(p_email_aluno))
      AND (r.corretor_id_1 = p_corretor_id OR r.corretor_id_2 = p_corretor_id)
      AND r.corrigida = false
      AND COALESCE(r.congelada, false) = false
      AND r.deleted_at IS NULL
      -- Se um tipo específico foi informado, filtrar por ele
      AND (p_tipo_envio IS NULL OR r.tipo_envio = p_tipo_envio)
    LIMIT 1;
  END IF;
END;
$$;
