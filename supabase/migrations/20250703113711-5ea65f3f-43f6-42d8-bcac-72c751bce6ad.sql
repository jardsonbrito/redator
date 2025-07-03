
-- 🔧 CORREÇÃO CRÍTICA: Limpeza completa de políticas conflitantes e problemáticas

-- 1. REMOVER POLÍTICAS DUPLICADAS E CONFLITANTES
DROP POLICY IF EXISTS "Usuários podem ver redações com seu email" ON public.redacoes_simulado;
DROP POLICY IF EXISTS "Users can view simulado redacoes with their email" ON public.redacoes_simulado;
DROP POLICY IF EXISTS "Permite inserção de redações de simulado" ON public.redacoes_simulado;
DROP POLICY IF EXISTS "Qualquer um pode inserir redações de simulado" ON public.redacoes_simulado;

-- 2. CORRIGIR FUNÇÃO can_access_redacao PARA SER MAIS RESTRITIVA
DROP FUNCTION IF EXISTS public.can_access_redacao(text, text);

CREATE OR REPLACE FUNCTION public.can_access_redacao(redacao_email text, user_email text)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
AS $$
BEGIN
  -- Log da tentativa de acesso para auditoria
  RAISE LOG 'AUDITORIA: Tentativa de acesso - Redacao Email: %, User Email: %', redacao_email, user_email;
  
  -- Verificações rigorosas
  IF redacao_email IS NULL OR user_email IS NULL THEN
    RAISE LOG 'NEGADO: Email nulo detectado';
    RETURN false;
  END IF;
  
  -- Normalização e comparação exata
  IF LOWER(TRIM(redacao_email)) != LOWER(TRIM(user_email)) THEN
    RAISE LOG 'NEGADO: Emails diferentes - % vs %', LOWER(TRIM(redacao_email)), LOWER(TRIM(user_email));
    RETURN false;
  END IF;
  
  -- Permitir admin principal
  IF public.is_main_admin() THEN
    RAISE LOG 'PERMITIDO: Acesso admin';
    RETURN true;
  END IF;
  
  RAISE LOG 'PERMITIDO: Emails idênticos validados';
  RETURN true;
END;
$$;

-- 3. RECRIAR POLÍTICAS SEGURAS PARA redacoes_simulado
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

CREATE POLICY "Allow simulado insertions"
ON public.redacoes_simulado
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Admin full simulado management"
ON public.redacoes_simulado
FOR ALL
TO authenticated
USING (public.is_main_admin())
WITH CHECK (public.is_main_admin());

-- 4. CORRIGIR POLÍTICAS DE redacoes_enviadas
DROP POLICY IF EXISTS "Secure access to redacoes_enviadas" ON public.redacoes_enviadas;
DROP POLICY IF EXISTS "Anyone can view redacoes_enviadas" ON public.redacoes_enviadas;

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

-- 5. FUNÇÃO PARA DEFINIR EMAIL DO USUÁRIO ATUAL (para contexto seguro)
CREATE OR REPLACE FUNCTION public.set_current_user_email(user_email text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  PERFORM set_config('app.current_user_email', user_email, true);
END;
$$;

-- 6. CRIAR TABELA DE AUDITORIA PARA ACESSOS NEGADOS
CREATE TABLE IF NOT EXISTS public.access_denied_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  attempted_email text NOT NULL,
  redacao_email text NOT NULL,
  redacao_id uuid NOT NULL,
  timestamp timestamp with time zone DEFAULT now(),
  ip_address inet,
  user_agent text
);

-- RLS para auditoria
ALTER TABLE public.access_denied_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Only admin can view denied access logs"
ON public.access_denied_log
FOR SELECT
TO authenticated
USING (public.is_main_admin());

-- 7. FUNÇÃO PARA LOG DE TENTATIVAS NEGADAS
CREATE OR REPLACE FUNCTION public.log_denied_access(
  attempted_email text,
  redacao_email text,
  redacao_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.access_denied_log (attempted_email, redacao_email, redacao_id)
  VALUES (attempted_email, redacao_email, redacao_id);
EXCEPTION
  WHEN OTHERS THEN
    -- Não bloquear se log falhar
    NULL;
END;
$$;

-- 8. VERIFICAR E CORRIGIR ÍNDICES PARA PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_redacoes_enviadas_email_lookup ON public.redacoes_enviadas(email_aluno);
CREATE INDEX IF NOT EXISTS idx_redacoes_simulado_email_lookup ON public.redacoes_simulado(email_aluno);

-- 9. GRANT CORRETO PARA FUNÇÕES
GRANT EXECUTE ON FUNCTION public.can_access_redacao(text, text) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.set_current_user_email(text) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.log_denied_access(text, text, uuid) TO authenticated, anon;

-- 10. VERIFICAÇÃO FINAL DE POLÍTICAS ATIVAS
SELECT 
  schemaname, 
  tablename, 
  policyname, 
  permissive, 
  roles, 
  cmd, 
  qual 
FROM pg_policies 
WHERE tablename IN ('redacoes_simulado', 'redacoes_enviadas')
ORDER BY tablename, policyname;
