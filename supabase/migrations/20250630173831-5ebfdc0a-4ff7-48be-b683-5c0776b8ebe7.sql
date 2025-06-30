
-- Remover política existente se houver conflito e criar nova política para inserção de simulados
DROP POLICY IF EXISTS "Allow insert for authenticated" ON public.simulados;
DROP POLICY IF EXISTS "Simulados ativos são visíveis para todos" ON public.simulados;

-- Criar política para permitir que admins insiram simulados
CREATE POLICY "Admins podem inserir simulados" 
  ON public.simulados 
  FOR INSERT 
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE id = auth.uid() 
      AND email = 'jardsonbrito@gmail.com'
    )
  );

-- Criar política para permitir que admins vejam e editem todos os simulados
CREATE POLICY "Admins podem gerenciar simulados" 
  ON public.simulados 
  FOR ALL 
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE id = auth.uid() 
      AND email = 'jardsonbrito@gmail.com'
    )
  );

-- Política para usuários visualizarem simulados ativos
CREATE POLICY "Simulados ativos são visíveis para todos" 
  ON public.simulados 
  FOR SELECT 
  USING (ativo = true);
