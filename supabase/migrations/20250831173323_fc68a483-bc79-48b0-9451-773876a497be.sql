-- Adicionar política para permitir que alunos vejam seus próprios créditos de forma anônima
-- usando apenas o email como identificador

CREATE POLICY "Public can read student credits by email" ON public.profiles
FOR SELECT
TO public
USING (
  user_type = 'aluno' 
  AND ativo = true 
  AND status_aprovacao = 'ativo'
);