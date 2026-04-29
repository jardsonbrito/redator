-- Permite que professor (sem sessão Supabase auth) atualize avatar_url
-- em profiles, idêntico ao mecanismo público dos alunos
CREATE POLICY "Professor pode atualizar avatar"
  ON public.profiles
  FOR UPDATE
  TO public
  USING (user_type = 'professor')
  WITH CHECK (user_type = 'professor');
