-- Monitoramento de Aproveitamento dos Alunos
-- Identidade por e-mail, sem Supabase Auth

-- 1. Tabela de eventos dos alunos
CREATE TABLE IF NOT EXISTS student_feature_event (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  occurred_at timestamptz NOT NULL DEFAULT now(),
  student_email text NOT NULL,        -- e-mail do aluno (normalizado em lower-case no RPC)
  feature text NOT NULL,              -- 'essay_regular' | 'essay_simulado' | 'lousa' | 'live' | 'gravada'
  action  text NOT NULL,              -- 'submitted' | 'opened' | 'completed' | 'participated' | 'not_participated' | 'watched'
  entity_id text,                     -- tema_id, lousa_id, live_id, video_id... como texto
  class_name text,                    -- 'Turma A' | 'Turma B' | 'Turma C' | 'Turma D' | 'Turma E'
  month int GENERATED ALWAYS AS (extract(month from occurred_at at time zone 'America/Fortaleza')) STORED,
  year  int GENERATED ALWAYS AS (extract(year  from occurred_at at time zone 'America/Fortaleza')) STORED,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  CONSTRAINT chk_feature CHECK (feature IN ('essay_regular','essay_simulado','lousa','live','gravada')),
  CONSTRAINT chk_action  CHECK (action IN ('submitted','opened','completed','participated','not_participated','watched'))
);

-- 2. Índices para performance
CREATE INDEX IF NOT EXISTS idx_sfe_student_at       ON student_feature_event(student_email, occurred_at);
CREATE INDEX IF NOT EXISTS idx_sfe_feature_action   ON student_feature_event(feature, action);
CREATE INDEX IF NOT EXISTS idx_sfe_class_month      ON student_feature_event(class_name, year, month);
CREATE INDEX IF NOT EXISTS idx_sfe_year_month_email ON student_feature_event(year, month, student_email);

-- 3. RPC para inserção padronizada de eventos
CREATE OR REPLACE FUNCTION track_event_by_email(
  p_student_email text,
  p_feature text,
  p_action text,
  p_entity_id text DEFAULT NULL,
  p_class_name text DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}'::jsonb
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER 
SET search_path = public
AS $$
DECLARE
  v_id uuid;
  v_class text;
  v_exists boolean;
BEGIN
  IF p_student_email IS NULL OR p_feature IS NULL OR p_action IS NULL THEN
    RAISE EXCEPTION 'student_email, feature e action são obrigatórios';
  END IF;

  -- Verifica aluno ativo por e-mail na tabela profiles
  SELECT true
    INTO v_exists
  FROM profiles
  WHERE LOWER(email) = LOWER(p_student_email)
    AND user_type = 'aluno'
    AND ativo = true
  LIMIT 1;

  IF NOT COALESCE(v_exists, false) THEN
    RAISE EXCEPTION 'Aluno não encontrado ou inativo para o e-mail: %', p_student_email;
  END IF;

  -- Deriva turma se não informada
  IF p_class_name IS NOT NULL THEN
    v_class := p_class_name;
  ELSE
    SELECT turma INTO v_class
    FROM profiles
    WHERE LOWER(email) = LOWER(p_student_email)
    LIMIT 1;
  END IF;

  INSERT INTO student_feature_event(
    student_email, feature, action, entity_id, class_name, metadata
  ) VALUES (
    LOWER(p_student_email), p_feature, p_action, p_entity_id, v_class, COALESCE(p_metadata,'{}'::jsonb)
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END $$;

-- 4. View: Última escolha do aluno por live (estado atual)
CREATE OR REPLACE VIEW v_live_status AS
SELECT
  student_email,
  entity_id AS live_id,
  (array_agg(action ORDER BY occurred_at DESC))[1] AS last_action
FROM student_feature_event
WHERE feature='live' AND entity_id IS NOT NULL
GROUP BY student_email, entity_id;

-- 5. View: Resumo mensal por aluno/turma
CREATE OR REPLACE VIEW v_student_month_activity AS
SELECT
  student_email,
  class_name,
  year, month,
  COUNT(*) FILTER (WHERE feature='essay_regular'  AND action='submitted')        AS essays_regular,
  COUNT(*) FILTER (WHERE feature='essay_simulado' AND action='submitted')        AS essays_simulado,
  COUNT(*) FILTER (WHERE feature='lousa'          AND action='opened')           AS lousas_abertas,
  COUNT(*) FILTER (WHERE feature='lousa'          AND action='completed')        AS lousas_concluidas,
  COUNT(*) FILTER (WHERE feature='gravada'        AND action='watched')          AS gravadas_assistidas,
  COUNT(*) FILTER (WHERE feature='live'           AND action='participated')     AS lives_participei,
  COUNT(*) FILTER (WHERE feature='live'           AND action='not_participated') AS lives_nao_participei
FROM student_feature_event
GROUP BY student_email, class_name, year, month;

-- 6. RLS para a tabela de eventos
ALTER TABLE student_feature_event ENABLE ROW LEVEL SECURITY;

-- Admin pode tudo
CREATE POLICY "Admin can manage student events" 
ON student_feature_event
FOR ALL
USING (is_main_admin())
WITH CHECK (is_main_admin());

-- Público pode inserir eventos (será controlado via backend)
CREATE POLICY "Public can insert events"
ON student_feature_event  
FOR INSERT
WITH CHECK (true);

-- Público pode ver eventos (será controlado via backend)
CREATE POLICY "Public can view events"
ON student_feature_event
FOR SELECT  
USING (true);