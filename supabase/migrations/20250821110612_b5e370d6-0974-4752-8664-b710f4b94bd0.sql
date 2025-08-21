-- Criar funções para as consultas do Monitoramento

-- 1. Função para listar alunos da turma com resumo mensal
CREATE OR REPLACE FUNCTION get_students_monthly_activity(
  p_class_name text,
  p_month int,
  p_year int
) RETURNS TABLE(
  profile_id uuid,
  nome text,
  student_email text,
  essays_regular bigint,
  essays_simulado bigint,
  lousas_concluidas bigint,
  lives_participei bigint,
  gravadas_assistidas bigint
)
LANGUAGE sql SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    s.id as profile_id,
    s.nome,
    LOWER(s.email) as student_email,
    COALESCE(a.essays_regular, 0) as essays_regular,
    COALESCE(a.essays_simulado, 0) as essays_simulado,
    COALESCE(a.lousas_concluidas, 0) as lousas_concluidas,
    COALESCE(a.lives_participei, 0) as lives_participei,
    COALESCE(a.gravadas_assistidas, 0) as gravadas_assistidas
  FROM profiles s
  LEFT JOIN v_student_month_activity a
    ON LOWER(a.student_email) = LOWER(s.email)
   AND a.class_name = p_class_name
   AND a.month = p_month
   AND a.year = p_year
  WHERE s.user_type = 'aluno'
    AND s.ativo = true
    AND s.turma = p_class_name
  ORDER BY s.nome;
$$;

-- 2. Função para detalhamento das atividades do aluno
CREATE OR REPLACE FUNCTION get_student_activity_details(
  p_student_email text,
  p_class_name text,
  p_month int,
  p_year int
) RETURNS TABLE(
  data_hora text,
  tipo text,
  acao text,
  entity_id text,
  metadata jsonb
)
LANGUAGE sql SECURITY DEFINER  
SET search_path = public
AS $$
  SELECT
    to_char(occurred_at at time zone 'America/Fortaleza','YYYY-MM-DD HH24:MI') as data_hora,
    CASE feature
      WHEN 'essay_regular'  THEN 'Redação (Regular)'
      WHEN 'essay_simulado' THEN 'Redação (Simulado)'
      WHEN 'lousa'          THEN 'Lousa'
      WHEN 'live'           THEN 'Aula ao Vivo'
      WHEN 'gravada'        THEN 'Aula Gravada'
    END as tipo,
    CASE action
      WHEN 'submitted'        THEN 'Enviado'
      WHEN 'opened'           THEN 'Aberta'
      WHEN 'completed'        THEN 'Concluída'
      WHEN 'participated'     THEN 'Participei'
      WHEN 'not_participated' THEN 'Não participei'
      WHEN 'watched'          THEN 'Assistiu'
    END as acao,
    COALESCE(entity_id, '') as entity_id,
    metadata
  FROM student_feature_event
  WHERE LOWER(student_email) = LOWER(p_student_email)
    AND (p_class_name = '' OR class_name = p_class_name)
    AND month = p_month 
    AND year = p_year
  ORDER BY occurred_at DESC;
$$;

-- 3. Função para resumo mensal de um aluno específico
CREATE OR REPLACE FUNCTION get_student_monthly_summary(
  p_student_email text,
  p_month int,
  p_year int
) RETURNS TABLE(
  essays_regular bigint,
  essays_simulado bigint,
  lousas_concluidas bigint,
  lives_participei bigint,
  gravadas_assistidas bigint
)
LANGUAGE sql SECURITY DEFINER
SET search_path = public  
AS $$
  SELECT
    COALESCE(essays_regular, 0) as essays_regular,
    COALESCE(essays_simulado, 0) as essays_simulado,
    COALESCE(lousas_concluidas, 0) as lousas_concluidas,
    COALESCE(lives_participei, 0) as lives_participei,
    COALESCE(gravadas_assistidas, 0) as gravadas_assistidas
  FROM v_student_month_activity
  WHERE LOWER(student_email) = LOWER(p_student_email)
    AND month = p_month
    AND year = p_year
  LIMIT 1;
$$;