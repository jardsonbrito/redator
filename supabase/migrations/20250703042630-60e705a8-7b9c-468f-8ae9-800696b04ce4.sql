-- ===============================================
-- SISTEMA DE AUTENTICAÇÃO SEGURO PARA ALUNOS
-- ===============================================

-- 1. Atualizar tabela profiles para suportar autenticação individual
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_authenticated_student BOOLEAN DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS turma_codigo TEXT;

-- 2. Função para criar perfil automaticamente quando aluno se cadastra
CREATE OR REPLACE FUNCTION public.handle_new_authenticated_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  -- Inserir perfil para usuário autenticado
  INSERT INTO public.profiles (
    id, 
    nome, 
    sobrenome, 
    email, 
    turma,
    turma_codigo,
    user_type,
    is_authenticated_student,
    created_at,
    updated_at
  )
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nome', 'Aluno'),
    COALESCE(NEW.raw_user_meta_data->>'sobrenome', 'Novo'),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'turma', ''),
    COALESCE(NEW.raw_user_meta_data->>'turma_codigo', ''),
    'aluno_autenticado',
    true,
    now(),
    now()
  );
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'Erro ao criar perfil autenticado: %', SQLERRM;
    RETURN NEW;
END;
$$;

-- 3. Trigger para criar perfil automaticamente
DROP TRIGGER IF EXISTS on_auth_user_created_authenticated ON auth.users;
CREATE TRIGGER on_auth_user_created_authenticated
  AFTER INSERT ON auth.users
  FOR EACH ROW 
  WHEN (NEW.raw_user_meta_data->>'user_type' = 'aluno_autenticado')
  EXECUTE FUNCTION public.handle_new_authenticated_user();

-- 4. Função para validar e mapear turma
CREATE OR REPLACE FUNCTION public.get_turma_codigo(turma_nome TEXT)
RETURNS TEXT
LANGUAGE SQL
STABLE
AS $$
  SELECT CASE turma_nome
    WHEN 'Turma A' THEN 'LRA2025'
    WHEN 'Turma B' THEN 'LRB2025'
    WHEN 'Turma C' THEN 'LRC2025'
    WHEN 'Turma D' THEN 'LRD2025'
    WHEN 'Turma E' THEN 'LRE2025'
    ELSE turma_nome
  END;
$$;

-- 5. Função para buscar redações do aluno autenticado
CREATE OR REPLACE FUNCTION public.get_student_redacoes(student_email TEXT)
RETURNS TABLE(
  id UUID,
  frase_tematica TEXT,
  nome_aluno TEXT,
  email_aluno TEXT,
  tipo_envio TEXT,
  data_envio TIMESTAMP WITH TIME ZONE,
  status TEXT,
  corrigida BOOLEAN,
  nota_total INTEGER,
  comentario_admin TEXT,
  data_correcao TIMESTAMP WITH TIME ZONE
)
LANGUAGE SQL
SECURITY DEFINER
STABLE
AS $$
  SELECT 
    r.id,
    r.frase_tematica,
    r.nome_aluno,
    r.email_aluno,
    COALESCE(r.tipo_envio, 'regular') as tipo_envio,
    r.data_envio,
    COALESCE(r.status, CASE WHEN r.corrigida THEN 'corrigido' ELSE 'aguardando' END) as status,
    r.corrigida,
    r.nota_total,
    r.comentario_admin,
    r.data_correcao
  FROM public.redacoes_enviadas r
  WHERE r.email_aluno = student_email
  AND r.tipo_envio IN ('regular', 'simulado', 'visitante')
  ORDER BY r.data_envio DESC;
$$;

-- 6. RLS Policy para alunos autenticados acessarem suas redações
CREATE POLICY "Authenticated students can view their own redacoes" 
ON public.redacoes_enviadas 
FOR SELECT 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.id = auth.uid() 
    AND p.is_authenticated_student = true 
    AND p.email = redacoes_enviadas.email_aluno
  )
);

-- 7. Função para verificar se usuário é aluno autenticado
CREATE OR REPLACE FUNCTION public.is_authenticated_student()
RETURNS BOOLEAN
LANGUAGE SQL
STABLE SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND is_authenticated_student = true
  );
$$;

-- 8. Atualizar políticas existentes para não interferir com novos usuários
-- (As políticas existentes já estão bem configuradas, apenas garantindo compatibilidade)