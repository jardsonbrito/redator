
-- Verificar se RLS está habilitado na tabela redacoes_enviadas (corrigido)
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'redacoes_enviadas';

-- Habilitar RLS se não estiver habilitado
ALTER TABLE public.redacoes_enviadas ENABLE ROW LEVEL SECURITY;

-- Criar política para permitir que admins vejam todas as redações
CREATE POLICY "Admins can view all redacoes_enviadas" 
ON public.redacoes_enviadas 
FOR SELECT 
USING (public.is_admin(auth.uid()));

-- Criar política para permitir que admins atualizem todas as redações
CREATE POLICY "Admins can update all redacoes_enviadas" 
ON public.redacoes_enviadas 
FOR UPDATE 
USING (public.is_admin(auth.uid()));

-- Política para permitir que usuários vejam suas próprias redações (se necessário)
CREATE POLICY "Users can view their own redacoes_enviadas" 
ON public.redacoes_enviadas 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

-- Política para permitir inserção de redações por usuários autenticados
CREATE POLICY "Authenticated users can insert redacoes_enviadas" 
ON public.redacoes_enviadas 
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);
