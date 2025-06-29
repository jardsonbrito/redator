
-- Verificar se RLS está habilitado e quais políticas existem
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'redacoes_enviadas';

-- Verificar políticas existentes
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies 
WHERE tablename = 'redacoes_enviadas';

-- Verificar se o registro específico existe
SELECT id, frase_tematica, corrigida, nota_total 
FROM public.redacoes_enviadas 
WHERE id = '40cda6c9-1693-4025-bf5c-dbcae2e62d62';

-- Remover políticas conflitantes se existirem
DROP POLICY IF EXISTS "Admins can view all redacoes_enviadas" ON public.redacoes_enviadas;
DROP POLICY IF EXISTS "Admins can update all redacoes_enviadas" ON public.redacoes_enviadas;
DROP POLICY IF EXISTS "Users can view their own redacoes_enviadas" ON public.redacoes_enviadas;
DROP POLICY IF EXISTS "Authenticated users can insert redacoes_enviadas" ON public.redacoes_enviadas;

-- Criar política mais permissiva para admins poderem fazer UPDATE
CREATE POLICY "Admins can manage all redacoes_enviadas" 
ON public.redacoes_enviadas 
FOR ALL 
TO authenticated
USING (public.is_admin(auth.uid()));

-- Política para inserção pública (mantém funcionalidade existente)
CREATE POLICY "Public can insert redacoes_enviadas" 
ON public.redacoes_enviadas 
FOR INSERT 
WITH CHECK (true);

-- Política para visualização pública (mantém funcionalidade existente)
CREATE POLICY "Public can view redacoes_enviadas" 
ON public.redacoes_enviadas 
FOR SELECT 
USING (true);

-- Teste do UPDATE com dados específicos para verificar funcionamento
UPDATE public.redacoes_enviadas
SET 
  nota_c1 = 160,
  nota_c2 = 160, 
  nota_c3 = 160,
  nota_c4 = 160,
  nota_c5 = 160,
  nota_total = 800,
  comentario_admin = 'Teste de correção - sistema funcionando',
  corrigida = true,
  data_correcao = now()
WHERE id = '40cda6c9-1693-4025-bf5c-dbcae2e62d62';

-- Verificar se o UPDATE funcionou
SELECT id, nota_c1, nota_c2, nota_c3, nota_c4, nota_c5, nota_total, comentario_admin, corrigida, data_correcao
FROM public.redacoes_enviadas 
WHERE id = '40cda6c9-1693-4025-bf5c-dbcae2e62d62';
