
-- Verificar e corrigir as políticas RLS para redacoes_enviadas
-- Primeiro, remover todas as políticas existentes que podem estar conflitando
DROP POLICY IF EXISTS "Admins can manage all redacoes_enviadas" ON public.redacoes_enviadas;
DROP POLICY IF EXISTS "Public can insert redacoes_enviadas" ON public.redacoes_enviadas;
DROP POLICY IF EXISTS "Public can view redacoes_enviadas" ON public.redacoes_enviadas;
DROP POLICY IF EXISTS "Admins can view all redacoes_enviadas" ON public.redacoes_enviadas;
DROP POLICY IF EXISTS "Admins can update all redacoes_enviadas" ON public.redacoes_enviadas;
DROP POLICY IF EXISTS "Users can view their own redacoes_enviadas" ON public.redacoes_enviadas;
DROP POLICY IF EXISTS "Authenticated users can insert redacoes_enviadas" ON public.redacoes_enviadas;
DROP POLICY IF EXISTS "Apenas admins podem corrigir redações" ON public.redacoes_enviadas;
DROP POLICY IF EXISTS "Permitir visualização pública de redações enviadas" ON public.redacoes_enviadas;
DROP POLICY IF EXISTS "Permitir inserção pública de redações" ON public.redacoes_enviadas;

-- Criar função específica para verificar se é o admin principal
CREATE OR REPLACE FUNCTION public.is_main_admin()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM auth.users 
    WHERE id = auth.uid() 
    AND email = 'jardsonbrito@gmail.com'
  );
$$;

-- Política para permitir que o admin principal faça qualquer operação
CREATE POLICY "Main admin full access" 
ON public.redacoes_enviadas 
FOR ALL 
TO authenticated
USING (public.is_main_admin())
WITH CHECK (public.is_main_admin());

-- Política para permitir inserção pública (manter funcionalidade existente)
CREATE POLICY "Anyone can insert redacoes_enviadas" 
ON public.redacoes_enviadas 
FOR INSERT 
WITH CHECK (true);

-- Política para visualização pública (manter funcionalidade existente)
CREATE POLICY "Anyone can view redacoes_enviadas" 
ON public.redacoes_enviadas 
FOR SELECT 
USING (true);

-- Teste direto para verificar se as políticas estão funcionando
DO $$
BEGIN
  -- Tentar fazer um UPDATE de teste na redação específica
  UPDATE public.redacoes_enviadas
  SET comentario_admin = 'Teste de política RLS - ' || now()::text
  WHERE id = 'a2650729-4b67-4160-8274-2ca65ceda0ed';
  
  RAISE NOTICE 'UPDATE de teste executado com sucesso!';
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Erro no UPDATE de teste: %', SQLERRM;
END $$;
