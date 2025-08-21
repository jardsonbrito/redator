-- Migrar dados históricos de student_feature_event para recorded_lesson_views
INSERT INTO public.recorded_lesson_views (
  lesson_id,
  user_id,
  student_email,
  student_name,
  first_watched_at,
  created_at
)
SELECT DISTINCT
  sfe.entity_id::uuid as lesson_id,
  p.id as user_id,
  sfe.student_email,
  p.nome || ' ' || p.sobrenome as student_name,
  MIN(sfe.occurred_at) as first_watched_at,
  MIN(sfe.occurred_at) as created_at
FROM public.student_feature_event sfe
JOIN public.profiles p ON p.email = sfe.student_email AND p.user_type = 'aluno'
WHERE sfe.feature = 'gravada' 
  AND sfe.action = 'watched'
  AND NOT EXISTS (
    SELECT 1 FROM public.recorded_lesson_views rlv 
    WHERE rlv.lesson_id = sfe.entity_id::uuid 
    AND rlv.student_email = sfe.student_email
  )
GROUP BY sfe.entity_id, p.id, sfe.student_email, p.nome, p.sobrenome
ON CONFLICT (lesson_id, user_id) DO NOTHING;