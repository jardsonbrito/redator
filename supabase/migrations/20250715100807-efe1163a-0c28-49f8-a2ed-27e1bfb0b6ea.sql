-- Adicionar campos para controle de aprovação de alunos cadastrados via autoatendimento
ALTER TABLE public.profiles 
ADD COLUMN status_aprovacao TEXT DEFAULT 'ativo' CHECK (status_aprovacao IN ('pendente', 'ativo', 'recusado')),
ADD COLUMN data_solicitacao TIMESTAMP WITH TIME ZONE DEFAULT now(),
ADD COLUMN aprovado_por UUID REFERENCES public.profiles(id),
ADD COLUMN data_aprovacao TIMESTAMP WITH TIME ZONE;

-- Atualizar registros existentes inativos (cadastrados via autoatendimento) para pendente
UPDATE public.profiles 
SET status_aprovacao = 'pendente'
WHERE ativo = false AND user_type = 'aluno';

-- Função para buscar alunos pendentes de aprovação
CREATE OR REPLACE FUNCTION public.get_alunos_pendentes()
RETURNS TABLE(
  id uuid,
  nome text,
  email text,
  turma text,
  data_solicitacao timestamp with time zone
)
LANGUAGE sql
STABLE SECURITY DEFINER
AS $$
  SELECT 
    p.id,
    p.nome,
    p.email,
    p.turma,
    p.data_solicitacao
  FROM public.profiles p
  WHERE p.user_type = 'aluno' 
    AND p.status_aprovacao = 'pendente'
    AND p.ativo = false
  ORDER BY p.data_solicitacao ASC;
$$;

-- Função para aprovar aluno
CREATE OR REPLACE FUNCTION public.aprovar_aluno(
  aluno_id uuid,
  admin_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Verificar se é admin
  IF NOT public.is_main_admin() THEN
    RAISE EXCEPTION 'Acesso negado: apenas administradores podem aprovar alunos';
  END IF;

  -- Atualizar status do aluno
  UPDATE public.profiles 
  SET 
    status_aprovacao = 'ativo',
    ativo = true,
    aprovado_por = admin_id,
    data_aprovacao = now(),
    updated_at = now()
  WHERE id = aluno_id 
    AND user_type = 'aluno' 
    AND status_aprovacao = 'pendente';

  -- Verificar se a atualização foi bem-sucedida
  IF FOUND THEN
    RETURN true;
  ELSE
    RETURN false;
  END IF;
END;
$$;

-- Função para recusar aluno
CREATE OR REPLACE FUNCTION public.recusar_aluno(
  aluno_id uuid,
  admin_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Verificar se é admin
  IF NOT public.is_main_admin() THEN
    RAISE EXCEPTION 'Acesso negado: apenas administradores podem recusar alunos';
  END IF;

  -- Atualizar status do aluno
  UPDATE public.profiles 
  SET 
    status_aprovacao = 'recusado',
    ativo = false,
    aprovado_por = admin_id,
    data_aprovacao = now(),
    updated_at = now()
  WHERE id = aluno_id 
    AND user_type = 'aluno' 
    AND status_aprovacao = 'pendente';

  -- Verificar se a atualização foi bem-sucedida
  IF FOUND THEN
    RETURN true;
  ELSE
    RETURN false;
  END IF;
END;
$$;