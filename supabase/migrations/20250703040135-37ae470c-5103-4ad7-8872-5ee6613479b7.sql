
-- Corrigir políticas RLS duplicadas e problemáticas
-- Primeiro, remover políticas duplicadas e conflitantes

-- Limpar políticas duplicadas da tabela profiles
DROP POLICY IF EXISTS "Usuários podem ver seu próprio perfil" ON public.profiles;
DROP POLICY IF EXISTS "Usuários podem ver seus próprios perfis" ON public.profiles;

-- Limpar políticas conflitantes da tabela redacoes
DROP POLICY IF EXISTS "Permitir acesso total às redações" ON public.redacoes;
DROP POLICY IF EXISTS "Permitir cadastro de redações" ON public.redacoes;
DROP POLICY IF EXISTS "Permitir leitura pública de redações" ON public.redacoes;

-- Limpar políticas conflitantes da tabela temas
DROP POLICY IF EXISTS "Permitir cadastro de temas" ON public.temas;
DROP POLICY IF EXISTS "Todos podem ver temas" ON public.temas;

-- Limpar políticas conflitantes da tabela videos
DROP POLICY IF EXISTS "Permitir cadastro de vídeos" ON public.videos;
DROP POLICY IF EXISTS "Todos podem ver vídeos" ON public.videos;

-- Corrigir políticas da tabela redacoes_simulado que referenciam auth.users diretamente
DROP POLICY IF EXISTS "Admins podem gerenciar redações de simulado" ON public.redacoes_simulado;
DROP POLICY IF EXISTS "Admins podem ver todas as redações de simulado" ON public.redacoes_simulado;
DROP POLICY IF EXISTS "Admins podem ver todas redações de simulado" ON public.redacoes_simulado;

-- Criar políticas seguras para redacoes_simulado usando função segura
CREATE POLICY "Admin can manage all redacoes_simulado" 
ON public.redacoes_simulado 
FOR ALL 
TO authenticated
USING (public.is_main_admin())
WITH CHECK (public.is_main_admin());

-- Garantir que apenas visitantes vejam suas próprias redações de simulado
CREATE POLICY "Users can view simulado redacoes with their email" 
ON public.redacoes_simulado 
FOR SELECT 
USING (
  email_aluno = current_setting('request.jwt.claims', true)::json->>'email' 
  OR public.is_main_admin()
);

-- Melhorar performance das consultas com índices otimizados
CREATE INDEX IF NOT EXISTS idx_redacoes_enviadas_email_turma ON public.redacoes_enviadas(email_aluno, turma);
CREATE INDEX IF NOT EXISTS idx_redacoes_enviadas_corrigida_data ON public.redacoes_enviadas(corrigida, data_envio DESC);
CREATE INDEX IF NOT EXISTS idx_redacoes_simulado_email_corrigida ON public.redacoes_simulado(email_aluno, corrigida);

-- Otimizar função is_main_admin para evitar múltiplas consultas
CREATE OR REPLACE FUNCTION public.is_main_admin()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
AS $$
  SELECT auth.email() = 'jardsonbrito@gmail.com';
$$;

-- Criar função para verificar acesso seguro a redações
CREATE OR REPLACE FUNCTION public.can_access_redacao(redacao_email text, user_email text)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
AS $$
  SELECT LOWER(redacao_email) = LOWER(user_email) OR public.is_main_admin();
$$;

-- Adicionar política mais restritiva para redacoes_enviadas
DROP POLICY IF EXISTS "Anyone can view redacoes_enviadas" ON public.redacoes_enviadas;

CREATE POLICY "Secure access to redacoes_enviadas" 
ON public.redacoes_enviadas 
FOR SELECT 
USING (
  public.is_main_admin() 
  OR email_aluno = current_setting('request.jwt.claims', true)::json->>'email'
);

-- Limitar inserções de redacoes_enviadas para evitar spam
ALTER TABLE public.redacoes_enviadas 
ADD COLUMN IF NOT EXISTS created_by_ip inet;

-- Função para log de acessos sensíveis (opcional para auditoria)
CREATE OR REPLACE FUNCTION public.log_redacao_access()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Log apenas para acessos de dados sensíveis (correções)
  IF NEW.corrigida = true AND OLD.corrigida = false THEN
    INSERT INTO public.access_logs (table_name, record_id, action, user_id, timestamp)
    VALUES ('redacoes_enviadas', NEW.id, 'correction_accessed', auth.uid(), now())
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RETURN NEW; -- Não bloquear operação se log falhar
END;
$$;

-- Criar tabela de logs se não existir
CREATE TABLE IF NOT EXISTS public.access_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name text NOT NULL,
  record_id uuid NOT NULL,
  action text NOT NULL,
  user_id uuid,
  timestamp timestamp with time zone DEFAULT now(),
  ip_address inet
);

-- RLS para tabela de logs
ALTER TABLE public.access_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Only admin can view access logs" 
ON public.access_logs 
FOR SELECT 
TO authenticated
USING (public.is_main_admin());
