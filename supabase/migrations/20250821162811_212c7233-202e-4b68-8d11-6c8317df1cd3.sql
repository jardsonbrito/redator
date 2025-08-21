-- Sistema de tracking de visualizações de aulas gravadas
-- Usando fuso horário America/Fortaleza

-- Tabela para registrar visualizações únicas
CREATE TABLE IF NOT EXISTS public.recorded_lesson_views (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lesson_id UUID NOT NULL,      -- ID da aula gravada (videos table)
  first_watched_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  student_email TEXT,           -- Para compatibilidade com sistema atual
  student_name TEXT,            -- Para relatórios
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, lesson_id)
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_recorded_lesson_views_lesson_id 
ON public.recorded_lesson_views (lesson_id);

CREATE INDEX IF NOT EXISTS idx_recorded_lesson_views_first_watched_at 
ON public.recorded_lesson_views (first_watched_at);

CREATE INDEX IF NOT EXISTS idx_recorded_lesson_views_student_email 
ON public.recorded_lesson_views (student_email);

-- RLS policies
ALTER TABLE public.recorded_lesson_views ENABLE ROW LEVEL SECURITY;

-- Aluno só vê seus próprios registros
CREATE POLICY "recorded_lesson_views_select_own" 
ON public.recorded_lesson_views FOR SELECT 
TO authenticated 
USING (auth.uid() = user_id);

-- Aluno só insere registro próprio
CREATE POLICY "recorded_lesson_views_insert_own" 
ON public.recorded_lesson_views FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = user_id);

-- Admin pode ver todos
CREATE POLICY "recorded_lesson_views_admin_all" 
ON public.recorded_lesson_views FOR ALL 
TO authenticated 
USING (public.is_main_admin()) 
WITH CHECK (public.is_main_admin());

-- RPC para marcar aula como assistida (idempotente)
CREATE OR REPLACE FUNCTION public.mark_recorded_lesson_view(
  p_lesson_id UUID,
  p_student_email TEXT DEFAULT NULL,
  p_student_name TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_user_id UUID;
  lesson_exists BOOLEAN;
BEGIN
  -- Verificar se user está autenticado
  current_user_id := auth.uid();
  IF current_user_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'not_authenticated',
      'message', 'Usuário não autenticado'
    );
  END IF;
  
  -- Verificar se a aula existe
  SELECT EXISTS(SELECT 1 FROM public.videos WHERE id = p_lesson_id) INTO lesson_exists;
  IF NOT lesson_exists THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'lesson_not_found',
      'message', 'Aula não encontrada'
    );
  END IF;
  
  -- Inserir registro (idempotente)
  INSERT INTO public.recorded_lesson_views (
    user_id, 
    lesson_id, 
    first_watched_at,
    student_email,
    student_name
  ) VALUES (
    current_user_id, 
    p_lesson_id, 
    NOW() AT TIME ZONE 'America/Fortaleza',
    p_student_email,
    p_student_name
  )
  ON CONFLICT (user_id, lesson_id) DO NOTHING;
  
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Visualização registrada com sucesso'
  );
END;
$$;

-- RPC para obter mapa de visualizações do usuário atual
CREATE OR REPLACE FUNCTION public.get_recorded_lesson_views_map()
RETURNS TABLE (lesson_id UUID, first_watched_at TIMESTAMPTZ)
LANGUAGE SQL
SECURITY DEFINER
AS $$
  SELECT rlv.lesson_id, rlv.first_watched_at
  FROM public.recorded_lesson_views rlv
  WHERE rlv.user_id = auth.uid();
$$;

-- RPC para contar aulas assistidas no mês atual (fuso Fortaleza)
CREATE OR REPLACE FUNCTION public.count_monthly_recorded_lessons(
  p_user_id UUID DEFAULT NULL,
  p_student_email TEXT DEFAULT NULL
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  target_user_id UUID;
  month_start TIMESTAMPTZ;
  month_end TIMESTAMPTZ;
  lesson_count INTEGER;
BEGIN
  -- Determinar user_id
  IF p_user_id IS NOT NULL THEN
    target_user_id := p_user_id;
  ELSIF p_student_email IS NOT NULL THEN
    -- Buscar por email se fornecido
    SELECT id INTO target_user_id 
    FROM public.profiles 
    WHERE email = LOWER(TRIM(p_student_email)) 
    LIMIT 1;
  ELSE
    target_user_id := auth.uid();
  END IF;
  
  IF target_user_id IS NULL THEN
    RETURN 0;
  END IF;
  
  -- Calcular limites do mês atual em Fortaleza
  month_start := date_trunc('month', (NOW() AT TIME ZONE 'America/Fortaleza'));
  month_end := month_start + INTERVAL '1 month';
  
  -- Contar aulas distintas assistidas no mês
  SELECT COUNT(*)::INTEGER INTO lesson_count
  FROM public.recorded_lesson_views rlv
  WHERE rlv.user_id = target_user_id
    AND (rlv.first_watched_at AT TIME ZONE 'America/Fortaleza') >= month_start
    AND (rlv.first_watched_at AT TIME ZONE 'America/Fortaleza') < month_end;
  
  RETURN COALESCE(lesson_count, 0);
END;
$$;

-- RPC para radar administrativo (por aluno no mês atual)
CREATE OR REPLACE FUNCTION public.get_recorded_lessons_radar()
RETURNS TABLE (
  student_id UUID,
  student_name TEXT,
  student_email TEXT,
  turma TEXT,
  recorded_lessons_count INTEGER
)
LANGUAGE SQL
SECURITY DEFINER
AS $$
  WITH month_bounds AS (
    SELECT 
      date_trunc('month', (NOW() AT TIME ZONE 'America/Fortaleza')) as month_start,
      date_trunc('month', (NOW() AT TIME ZONE 'America/Fortaleza')) + INTERVAL '1 month' as month_end
  )
  SELECT 
    p.id as student_id,
    p.nome || ' ' || COALESCE(p.sobrenome, '') as student_name,
    p.email as student_email,
    p.turma,
    COUNT(rlv.lesson_id)::INTEGER as recorded_lessons_count
  FROM public.profiles p
  LEFT JOIN public.recorded_lesson_views rlv ON p.id = rlv.user_id
  CROSS JOIN month_bounds mb
  WHERE p.user_type = 'aluno' 
    AND p.ativo = true
    AND (rlv.lesson_id IS NULL OR (
      (rlv.first_watched_at AT TIME ZONE 'America/Fortaleza') >= mb.month_start 
      AND (rlv.first_watched_at AT TIME ZONE 'America/Fortaleza') < mb.month_end
    ))
  GROUP BY p.id, p.nome, p.sobrenome, p.email, p.turma
  ORDER BY student_name;
$$;

-- Grants
GRANT EXECUTE ON FUNCTION public.mark_recorded_lesson_view(UUID, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_recorded_lesson_views_map() TO authenticated;
GRANT EXECUTE ON FUNCTION public.count_monthly_recorded_lessons(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_recorded_lessons_radar() TO authenticated;