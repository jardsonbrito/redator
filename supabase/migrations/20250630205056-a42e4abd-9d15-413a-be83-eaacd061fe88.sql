
-- Adicionar campo permite_visitante se não existir
ALTER TABLE public.simulados 
ADD COLUMN IF NOT EXISTS permite_visitante BOOLEAN DEFAULT false;

-- Corrigir políticas RLS para simulados
DROP POLICY IF EXISTS "Simulados ativos são visíveis para todos" ON public.simulados;
DROP POLICY IF EXISTS "Admins podem inserir simulados" ON public.simulados;
DROP POLICY IF EXISTS "Admins podem gerenciar simulados" ON public.simulados;

-- Política para todos verem simulados ativos
CREATE POLICY "Simulados ativos são visíveis para todos" 
  ON public.simulados 
  FOR SELECT 
  USING (ativo = true);

-- Política para admins gerenciarem simulados
CREATE POLICY "Admins podem gerenciar simulados" 
  ON public.simulados 
  FOR ALL 
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE id = auth.uid() 
      AND email = 'jardsonbrito@gmail.com'
    )
  );

-- Corrigir políticas RLS para redacoes_simulado
ALTER TABLE public.redacoes_simulado ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Alunos podem ver suas próprias redações de simulado" ON public.redacoes_simulado;
DROP POLICY IF EXISTS "Alunos podem inserir redações de simulado" ON public.redacoes_simulado;

-- Política para permitir inserção de redações de simulado
CREATE POLICY "Permite inserção de redações de simulado" 
  ON public.redacoes_simulado 
  FOR INSERT 
  WITH CHECK (true);

-- Política para admins verem todas as redações de simulado
CREATE POLICY "Admins podem ver todas redações de simulado" 
  ON public.redacoes_simulado 
  FOR SELECT 
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE id = auth.uid() 
      AND email = 'jardsonbrito@gmail.com'
    )
  );

-- Política para admins gerenciarem redações de simulado
CREATE POLICY "Admins podem gerenciar redações de simulado" 
  ON public.redacoes_simulado 
  FOR UPDATE 
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE id = auth.uid() 
      AND email = 'jardsonbrito@gmail.com'
    )
  );

-- Índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_simulados_turmas ON public.simulados USING GIN(turmas_autorizadas);
CREATE INDEX IF NOT EXISTS idx_simulados_ativo_data ON public.simulados(ativo, data_inicio, data_fim);
CREATE INDEX IF NOT EXISTS idx_redacoes_simulado_turma ON public.redacoes_simulado(turma);
CREATE INDEX IF NOT EXISTS idx_redacoes_simulado_email ON public.redacoes_simulado(email_aluno);
CREATE INDEX IF NOT EXISTS idx_redacoes_simulado_corrigida ON public.redacoes_simulado(corrigida);
