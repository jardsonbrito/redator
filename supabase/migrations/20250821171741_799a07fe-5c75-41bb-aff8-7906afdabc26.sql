-- Migrar dados diretamente sem função
-- Primeiro obter os IDs únicos de vídeos da Antônia
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
  AND sfe.student_email = 'anajuliafreitas11222@gmail.com'
  AND sfe.entity_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
GROUP BY sfe.entity_id, p.id, sfe.student_email, p.nome, p.sobrenome
ON CONFLICT (lesson_id, user_id) DO NOTHING;