-- Permite leitura pública de perfis de professores (mesmo mecanismo dos alunos)
CREATE POLICY "Professor pode ler próprio perfil"
  ON public.profiles
  FOR SELECT
  TO public
  USING (user_type = 'professor');
