
-- 🔧 CORREÇÃO COMPLETA DOS 22 ALERTAS DO SUPABASE

-- 1. CORRIGIR FUNÇÃO can_access_redacao QUE ESTAVA RETORNANDO NULL
DROP FUNCTION IF EXISTS public.can_access_redacao(text, text);

CREATE OR REPLACE FUNCTION public.can_access_redacao(redacao_email text, user_email text)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
AS $$
  SELECT 
    CASE 
      WHEN redacao_email IS NULL OR user_email IS NULL THEN false
      WHEN LOWER(TRIM(redacao_email)) = LOWER(TRIM(user_email)) THEN true
      WHEN public.is_main_admin() THEN true
      ELSE false
    END;
$$;

-- 2. CORRIGIR POLÍTICA DUPLICADA EM redacoes_simulado
DROP POLICY IF EXISTS "Users can view simulado redacoes with their email" ON public.redacoes_simulado;
DROP POLICY IF EXISTS "Secure simulado access by email only" ON public.redacoes_simulado;

-- Recriar política única e correta
CREATE POLICY "Secure simulado access by email only"
ON public.redacoes_simulado
FOR SELECT
USING (
  public.can_access_redacao(email_aluno, 
    COALESCE(
      current_setting('app.current_user_email', true),
      ((current_setting('request.jwt.claims', true))::json ->> 'email'::text),
      ''
    )
  )
);

-- 3. CORRIGIR POLÍTICA DUPLICADA EM redacoes_enviadas
DROP POLICY IF EXISTS "Secure redacoes_enviadas access" ON public.redacoes_enviadas;
DROP POLICY IF EXISTS "Authenticated students can view their own redacoes" ON public.redacoes_enviadas;

-- Recriar política única
CREATE POLICY "Secure redacoes_enviadas access"
ON public.redacoes_enviadas
FOR SELECT
USING (
  public.is_main_admin() OR 
  public.can_access_redacao(email_aluno, 
    COALESCE(
      current_setting('app.current_user_email', true),
      ((current_setting('request.jwt.claims', true))::json ->> 'email'::text),
      ''
    )
  )
);

-- 4. CORRIGIR FUNÇÃO is_admin_user INCONSISTENTE
DROP FUNCTION IF EXISTS public.is_admin_user();

CREATE OR REPLACE FUNCTION public.is_admin_user()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
AS $$
  SELECT auth.email() = 'jardsonbrito@gmail.com';
$$;

-- 5. GARANTIR QUE is_main_admin EXISTE E É CONSISTENTE
CREATE OR REPLACE FUNCTION public.is_main_admin()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
AS $$
  SELECT auth.email() = 'jardsonbrito@gmail.com';
$$;

-- 6. CORRIGIR POLÍTICA INCONSISTENTE EM simulados
DROP POLICY IF EXISTS "Admins can manage all simulados" ON public.simulados;

CREATE POLICY "Admins can manage all simulados"
ON public.simulados
FOR ALL
TO authenticated
USING (public.is_main_admin())
WITH CHECK (public.is_main_admin());

-- 7. CORRIGIR REFERÊNCIAS A TABELA auth.users EM POLÍTICAS ANTIGAS
DROP POLICY IF EXISTS "Admins podem atualizar redações" ON public.redacoes;
DROP POLICY IF EXISTS "Admins podem inserir redações" ON public.redacoes;
DROP POLICY IF EXISTS "Admins podem atualizar temas" ON public.temas;
DROP POLICY IF EXISTS "Admins podem inserir temas" ON public.temas;
DROP POLICY IF EXISTS "Admins podem atualizar vídeos" ON public.videos;
DROP POLICY IF EXISTS "Admins podem inserir vídeos" ON public.videos;

-- Recriar com função segura
CREATE POLICY "Admins podem atualizar redações" ON public.redacoes FOR UPDATE USING (public.is_main_admin());
CREATE POLICY "Admins podem inserir redações" ON public.redacoes FOR INSERT WITH CHECK (public.is_main_admin());
CREATE POLICY "Admins podem atualizar temas" ON public.temas FOR UPDATE USING (public.is_main_admin());
CREATE POLICY "Admins podem inserir temas" ON public.temas FOR INSERT WITH CHECK (public.is_main_admin());
CREATE POLICY "Admins podem atualizar vídeos" ON public.videos FOR UPDATE USING (public.is_main_admin());
CREATE POLICY "Admins podem inserir vídeos" ON public.videos FOR INSERT WITH CHECK (public.is_main_admin());

-- 8. LIMPAR POLÍTICAS ÓRFÃS E DUPLICADAS
DROP POLICY IF EXISTS "Admins podem deletar redações" ON public.redacoes;
DROP POLICY IF EXISTS "Admins podem deletar temas" ON public.temas;
DROP POLICY IF EXISTS "Admins podem deletar vídeos" ON public.videos;

-- Recriar com função correta
CREATE POLICY "Admins podem deletar redações" ON public.redacoes FOR DELETE USING (public.is_main_admin());
CREATE POLICY "Admins podem deletar temas" ON public.temas FOR DELETE USING (public.is_main_admin());
CREATE POLICY "Admins podem deletar vídeos" ON public.videos FOR DELETE USING (public.is_main_admin());

-- 9. CORRIGIR FUNÇÃO is_admin INCONSISTENTE
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

-- 10. GARANTIR GRANTS CORRETOS PARA TODAS AS FUNÇÕES
GRANT EXECUTE ON FUNCTION public.can_access_redacao(text, text) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.is_main_admin() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.is_admin_user() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.is_admin(uuid) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.set_current_user_email(text) TO authenticated, anon;

-- 11. VERIFICAR E CORRIGIR ÍNDICES FALTANTES
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_redacoes_enviadas_tipo_email ON public.redacoes_enviadas(tipo_envio, email_aluno);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_redacoes_simulado_corrigida_nota ON public.redacoes_simulado(corrigida, nota_total DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_profiles_email_admin ON public.profiles(email) WHERE email = 'jardsonbrito@gmail.com';

-- 12. LIMPAR TRIGGERS PROBLEMÁTICOS SE EXISTIREM
DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
DROP TRIGGER IF EXISTS update_avisos_updated_at ON public.avisos;

-- Recriar triggers corretos
CREATE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_profiles_updated_at();

CREATE TRIGGER update_avisos_updated_at
BEFORE UPDATE ON public.avisos
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- 13. VERIFICAÇÃO FINAL - LISTAR POLÍTICAS ATIVAS
SELECT 
  schemaname,
  tablename, 
  policyname,
  permissive,
  roles,
  cmd,
  CASE 
    WHEN LENGTH(qual) > 50 THEN LEFT(qual, 47) || '...'
    ELSE qual
  END as using_expression,
  CASE 
    WHEN LENGTH(with_check) > 50 THEN LEFT(with_check, 47) || '...'
    ELSE with_check
  END as check_expression
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- 14. VERIFICAR FUNÇÕES PROBLEMÁTICAS
SELECT 
  proname as function_name,
  provolatile as volatility,
  prosecdef as security_definer
FROM pg_proc 
WHERE pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
AND proname IN ('can_access_redacao', 'is_main_admin', 'is_admin_user', 'is_admin')
ORDER BY proname;
