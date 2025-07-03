
-- Corrigir alertas do Supabase - Políticas duplicadas e inconsistências

-- 1. Remover políticas duplicadas em redacoes_simulado
DROP POLICY IF EXISTS "Admin can manage all redacoes_simulado" ON public.redacoes_simulado;
DROP POLICY IF EXISTS "Admin full simulado management" ON public.redacoes_simulado;

-- Manter apenas uma política de admin para redacoes_simulado
CREATE POLICY "Admin can manage all redacoes_simulado"
ON public.redacoes_simulado
FOR ALL
TO authenticated
USING (public.is_main_admin())
WITH CHECK (public.is_main_admin());

-- 2. Corrigir política inconsistente em simulados (usar is_main_admin em vez de is_admin_user)
DROP POLICY IF EXISTS "Admins can manage all simulados" ON public.simulados;

CREATE POLICY "Admins can manage all simulados"
ON public.simulados
FOR ALL
TO authenticated
USING (public.is_main_admin())
WITH CHECK (public.is_main_admin());

-- 3. Corrigir políticas em redacoes_enviadas (remover duplicatas)
DROP POLICY IF EXISTS "Authenticated students can view their own redacoes" ON public.redacoes_enviadas;

-- Manter apenas as políticas necessárias para redacoes_enviadas
-- A política "Secure redacoes_enviadas access" já existe e está correta

-- 4. Garantir consistência na função is_admin_user
DROP FUNCTION IF EXISTS public.is_admin_user();

CREATE OR REPLACE FUNCTION public.is_admin_user()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
AS $$
  SELECT auth.email() = 'jardsonbrito@gmail.com';
$$;

-- 5. Corrigir políticas que referenciam tabelas auth diretamente
-- Remover políticas antigas que fazem referência direta a auth.users
DROP POLICY IF EXISTS "Admins podem gerenciar simulados" ON public.simulados;
DROP POLICY IF EXISTS "Admins podem inserir simulados" ON public.simulados;

-- 6. Limpar políticas órfãs em outras tabelas se existirem
DROP POLICY IF EXISTS "Admins can manage simulados" ON public.simulados;

-- 7. Garantir que todas as funções de admin sejam consistentes
-- Recriar função is_admin para usar email em vez de user_type
DROP FUNCTION IF EXISTS public.is_admin(uuid);

CREATE OR REPLACE FUNCTION public.is_admin(user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = user_id AND email = 'jardsonbrito@gmail.com'
  );
$$;

-- 8. Corrigir índices duplicados se existirem
DROP INDEX IF EXISTS idx_redacoes_simulado_email_lookup;
DROP INDEX IF EXISTS idx_redacoes_enviadas_email_lookup;

-- Recriar índices otimizados
CREATE INDEX IF NOT EXISTS idx_redacoes_simulado_email_corrigida ON public.redacoes_simulado(email_aluno, corrigida);
CREATE INDEX IF NOT EXISTS idx_redacoes_enviadas_email_turma ON public.redacoes_enviadas(email_aluno, turma);

-- 9. Garantir que todas as políticas RLS estejam habilitadas corretamente
ALTER TABLE public.redacoes_simulado ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.redacoes_enviadas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.simulados ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.presenca_aulas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.aulas_virtuais ENABLE ROW LEVEL SECURITY;

-- 10. Verificar e corrigir grants para funções
GRANT EXECUTE ON FUNCTION public.is_main_admin() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.is_admin_user() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.is_admin(uuid) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.can_access_redacao(text, text) TO authenticated, anon;
