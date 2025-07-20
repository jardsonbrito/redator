-- Permitir que corretores leiam perfis de alunos para exibir nomes nas conversas
CREATE POLICY "Corretores podem ver perfis de alunos" 
ON public.profiles 
FOR SELECT 
USING (
  user_type = 'aluno' AND (
    -- Permitir se é um corretor ativo
    EXISTS ( SELECT 1
       FROM corretores
      WHERE corretores.email = auth.email() AND corretores.ativo = true
    ) 
    OR 
    -- Admin sempre pode ver
    is_main_admin()
  )
);