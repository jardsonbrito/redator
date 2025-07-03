-- Atualizar tabela profiles para suportar autenticação individual
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS turma text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS created_at timestamp with time zone DEFAULT now();
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone DEFAULT now();

-- Atualizar redacoes_enviadas para incluir user_id
ALTER TABLE public.redacoes_enviadas ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id);

-- Atualizar redacoes_simulado para incluir user_id  
ALTER TABLE public.redacoes_simulado ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id);

-- Atualizar redacoes_exercicio para incluir user_id
ALTER TABLE public.redacoes_exercicio ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id);

-- Função para atualizar timestamp
CREATE OR REPLACE FUNCTION public.update_profiles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para atualizar updated_at automaticamente
DROP TRIGGER IF EXISTS update_profiles_updated_at_trigger ON public.profiles;
CREATE TRIGGER update_profiles_updated_at_trigger
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_profiles_updated_at();

-- Função para criar perfil automaticamente após signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, nome, sobrenome, email, user_type, turma)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nome', 'Usuário'),
    COALESCE(NEW.raw_user_meta_data->>'sobrenome', 'Novo'),
    NEW.email,
    COALESCE((NEW.raw_user_meta_data->>'user_type')::text, 'aluno'),
    COALESCE(NEW.raw_user_meta_data->>'turma', 'Visitante')
  );
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'Erro ao criar perfil: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para criar perfil automaticamente
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Política RLS para permitir usuários verem seu próprio perfil
CREATE POLICY IF NOT EXISTS "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY IF NOT EXISTS "Users can update own profile" ON public.profiles  
  FOR UPDATE USING (auth.uid() = id);

-- Políticas para redacoes_enviadas filtradas por usuário
CREATE POLICY IF NOT EXISTS "Users can view own redacoes_enviadas" ON public.redacoes_enviadas
  FOR SELECT USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY IF NOT EXISTS "Users can insert own redacoes_enviadas" ON public.redacoes_enviadas
  FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- Políticas para redacoes_simulado filtradas por usuário  
CREATE POLICY IF NOT EXISTS "Users can view own redacoes_simulado" ON public.redacoes_simulado
  FOR SELECT USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY IF NOT EXISTS "Users can insert own redacoes_simulado" ON public.redacoes_simulado
  FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- Políticas para redacoes_exercicio filtradas por usuário
CREATE POLICY IF NOT EXISTS "Users can view own redacoes_exercicio" ON public.redacoes_exercicio  
  FOR SELECT USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY IF NOT EXISTS "Users can insert own redacoes_exercicio" ON public.redacoes_exercicio
  FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id IS NULL);