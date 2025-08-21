-- Alterar a constraint para referenciar profiles ao invés de auth.users
ALTER TABLE public.recorded_lesson_views DROP CONSTRAINT IF EXISTS recorded_lesson_views_user_id_fkey;

-- Adicionar nova constraint para profiles
ALTER TABLE public.recorded_lesson_views 
ADD CONSTRAINT recorded_lesson_views_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;