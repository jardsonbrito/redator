-- Permitir que alunos (usuários anônimos) atualizem o avatar_url no próprio perfil.
-- Alunos NÃO usam Supabase Auth — autenticam via sistema customizado em localStorage.
-- Por isso auth.uid() é sempre NULL para eles e qualquer policy baseada em auth.uid() bloquearia a atualização silenciosamente.
CREATE POLICY "Public can update student avatar_url" ON public.profiles
FOR UPDATE
TO public
USING (user_type = 'aluno')
WITH CHECK (user_type = 'aluno');
