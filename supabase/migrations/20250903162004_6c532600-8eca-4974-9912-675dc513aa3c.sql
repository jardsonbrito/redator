-- Drop existing function first
DROP FUNCTION IF EXISTS get_redacoes_corretor_detalhadas(text);

-- Create function to get corrections for a specific corrector
-- This ensures each corrector sees only their assigned corrections with proper status isolation
CREATE OR REPLACE FUNCTION get_redacoes_corretor_detalhadas(corretor_email TEXT)
RETURNS TABLE (
  id UUID,
  tipo_redacao TEXT,
  nome_aluno TEXT,
  email_aluno TEXT,
  frase_tematica TEXT,
  data_envio TIMESTAMP WITH TIME ZONE,
  texto TEXT,
  status_minha_correcao TEXT,
  eh_corretor_1 BOOLEAN,
  eh_corretor_2 BOOLEAN,
  redacao_manuscrita_url TEXT,
  corretor_id_1 UUID,
  corretor_id_2 UUID,
  turma TEXT
) LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  corretor_id_atual UUID;
BEGIN
  -- Get the current corrector's ID
  SELECT c.id INTO corretor_id_atual 
  FROM corretores c 
  WHERE c.email = corretor_email AND c.ativo = true;
  
  IF corretor_id_atual IS NULL THEN
    RETURN;
  END IF;

  -- Return regular redacoes where this corrector is assigned
  RETURN QUERY
  SELECT 
    r.id,
    'regular'::TEXT as tipo_redacao,
    r.nome_aluno,
    r.email_aluno,
    COALESCE(t.frase_tematica, 'Tema livre') as frase_tematica,
    r.data_envio,
    r.redacao_texto as texto,
    CASE 
      WHEN r.corretor_id_1 = corretor_id_atual THEN
        CASE 
          WHEN r.status_corretor_1 IS NULL OR r.status_corretor_1 = '' THEN 'pendente'
          ELSE r.status_corretor_1
        END
      WHEN r.corretor_id_2 = corretor_id_atual THEN
        CASE 
          WHEN r.status_corretor_2 IS NULL OR r.status_corretor_2 = '' THEN 'pendente'
          ELSE r.status_corretor_2
        END
      ELSE 'pendente'
    END as status_minha_correcao,
    (r.corretor_id_1 = corretor_id_atual) as eh_corretor_1,
    (r.corretor_id_2 = corretor_id_atual) as eh_corretor_2,
    r.redacao_manuscrita_url,
    r.corretor_id_1,
    r.corretor_id_2,
    r.turma
  FROM redacoes_enviadas r
  LEFT JOIN temas t ON r.tema_id = t.id
  WHERE (r.corretor_id_1 = corretor_id_atual OR r.corretor_id_2 = corretor_id_atual)
  
  UNION ALL
  
  -- Return simulado redacoes where this corrector is assigned
  SELECT 
    rs.id,
    'simulado'::TEXT as tipo_redacao,
    rs.nome_aluno,
    rs.email_aluno,
    COALESCE(s.frase_tematica, 'Simulado') as frase_tematica,
    rs.data_envio,
    rs.texto,
    CASE 
      WHEN rs.corretor_id_1 = corretor_id_atual THEN
        CASE 
          WHEN rs.status_corretor_1 IS NULL OR rs.status_corretor_1 = '' THEN 'pendente'
          ELSE rs.status_corretor_1
        END
      WHEN rs.corretor_id_2 = corretor_id_atual THEN
        CASE 
          WHEN rs.status_corretor_2 IS NULL OR rs.status_corretor_2 = '' THEN 'pendente'
          ELSE rs.status_corretor_2
        END
      ELSE 'pendente'
    END as status_minha_correcao,
    (rs.corretor_id_1 = corretor_id_atual) as eh_corretor_1,
    (rs.corretor_id_2 = corretor_id_atual) as eh_corretor_2,
    rs.redacao_manuscrita_url,
    rs.corretor_id_1,
    rs.corretor_id_2,
    rs.turma
  FROM redacoes_simulado rs
  LEFT JOIN simulados s ON rs.id_simulado = s.id
  WHERE (rs.corretor_id_1 = corretor_id_atual OR rs.corretor_id_2 = corretor_id_atual)
  
  UNION ALL
  
  -- Return exercise redacoes where this corrector is assigned
  SELECT 
    re.id,
    'exercicio'::TEXT as tipo_redacao,
    re.nome_aluno,
    re.email_aluno,
    COALESCE(t.frase_tematica, 'Exercício') as frase_tematica,
    re.data_envio,
    re.redacao_texto as texto,
    CASE 
      WHEN re.corretor_id_1 = corretor_id_atual THEN
        CASE 
          WHEN re.status_corretor_1 IS NULL OR re.status_corretor_1 = '' THEN 'pendente'
          ELSE re.status_corretor_1
        END
      WHEN re.corretor_id_2 = corretor_id_atual THEN
        CASE 
          WHEN re.status_corretor_2 IS NULL OR re.status_corretor_2 = '' THEN 'pendente'
          ELSE re.status_corretor_2
        END
      ELSE 'pendente'
    END as status_minha_correcao,
    (re.corretor_id_1 = corretor_id_atual) as eh_corretor_1,
    (re.corretor_id_2 = corretor_id_atual) as eh_corretor_2,
    re.redacao_manuscrita_url,
    re.corretor_id_1,
    re.corretor_id_2,
    re.turma
  FROM redacoes_exercicio re
  LEFT JOIN temas t ON re.tema_id = t.id
  WHERE (re.corretor_id_1 = corretor_id_atual OR re.corretor_id_2 = corretor_id_atual)
  
  ORDER BY data_envio DESC;
END;
$$;