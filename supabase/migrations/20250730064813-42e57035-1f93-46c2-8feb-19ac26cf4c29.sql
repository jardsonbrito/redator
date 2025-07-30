-- Criar tabela de professores
CREATE TABLE public.professores (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome_completo TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  senha_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'professor' CHECK (role IN ('professor', 'admin')),
  ativo BOOLEAN NOT NULL DEFAULT true,
  primeiro_login BOOLEAN NOT NULL DEFAULT true,
  ultimo_login TIMESTAMP WITH TIME ZONE NULL,
  ultimo_ip INET NULL,
  ultimo_browser TEXT NULL,
  criado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  atualizado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.professores ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Admin pode gerenciar professores" 
ON public.professores 
FOR ALL 
USING (is_main_admin())
WITH CHECK (is_main_admin());

CREATE POLICY "Professores podem ver dados próprios" 
ON public.professores 
FOR SELECT 
USING (auth.email() = email);

CREATE POLICY "Professores podem atualizar dados próprios" 
ON public.professores 
FOR UPDATE 
USING (auth.email() = email)
WITH CHECK (auth.email() = email);

-- Trigger para atualizar timestamp
CREATE TRIGGER update_professores_updated_at
BEFORE UPDATE ON public.professores
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Tabela de logs de acesso dos professores
CREATE TABLE public.professor_access_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  professor_id UUID NOT NULL REFERENCES public.professores(id) ON DELETE CASCADE,
  data_acesso TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  ip_address INET NULL,
  user_agent TEXT NULL,
  acao TEXT NOT NULL DEFAULT 'login'
);

-- Habilitar RLS na tabela de logs
ALTER TABLE public.professor_access_logs ENABLE ROW LEVEL SECURITY;

-- Política para logs
CREATE POLICY "Admin pode ver logs de professores" 
ON public.professor_access_logs 
FOR ALL 
USING (is_main_admin())
WITH CHECK (is_main_admin());

-- Função para validar login de professor
CREATE OR REPLACE FUNCTION public.validate_professor_login(
  p_email TEXT,
  p_senha TEXT
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  professor_record RECORD;
  login_result JSONB;
BEGIN
  -- Buscar professor por email
  SELECT * INTO professor_record
  FROM public.professores 
  WHERE email = LOWER(TRIM(p_email)) 
  AND ativo = true;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'invalid_credentials',
      'message', 'Email ou senha inválidos'
    );
  END IF;
  
  -- Verificar senha (por enquanto comparação simples, depois implementar hash)
  IF professor_record.senha_hash != p_senha THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'invalid_credentials', 
      'message', 'Email ou senha inválidos'
    );
  END IF;
  
  -- Atualizar último login
  UPDATE public.professores 
  SET ultimo_login = now()
  WHERE id = professor_record.id;
  
  -- Inserir log de acesso
  INSERT INTO public.professor_access_logs (professor_id, acao)
  VALUES (professor_record.id, 'login');
  
  RETURN jsonb_build_object(
    'success', true,
    'professor', jsonb_build_object(
      'id', professor_record.id,
      'nome_completo', professor_record.nome_completo,
      'email', professor_record.email,
      'role', professor_record.role,
      'primeiro_login', professor_record.primeiro_login
    )
  );
END;
$$;

-- Função para trocar senha do professor
CREATE OR REPLACE FUNCTION public.trocar_senha_professor(
  professor_id UUID,
  nova_senha TEXT
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Atualizar senha e marcar que não é mais primeiro login
  UPDATE public.professores 
  SET 
    senha_hash = nova_senha,
    primeiro_login = false,
    atualizado_em = now()
  WHERE id = professor_id;
  
  IF FOUND THEN
    RETURN jsonb_build_object(
      'success', true,
      'message', 'Senha alterada com sucesso'
    );
  ELSE
    RETURN jsonb_build_object(
      'success', false,
      'error', 'professor_not_found',
      'message', 'Professor não encontrado'
    );
  END IF;
END;
$$;