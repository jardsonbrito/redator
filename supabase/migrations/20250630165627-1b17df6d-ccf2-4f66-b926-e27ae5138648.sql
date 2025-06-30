
-- Adicionar coluna para dados do visitante na sessão
ALTER TABLE public.simulados 
ADD COLUMN IF NOT EXISTS permite_visitante BOOLEAN DEFAULT false;

-- Atualizar a tabela de redações de simulado para incluir dados completos do aluno
ALTER TABLE public.redacoes_simulado 
ADD COLUMN IF NOT EXISTS dados_visitante JSONB DEFAULT NULL;

-- Criar índice para busca por email nas redações de simulado
CREATE INDEX IF NOT EXISTS idx_redacoes_simulado_email 
ON public.redacoes_simulado(email_aluno);

-- Atualizar políticas RLS para permitir acesso baseado em email
DROP POLICY IF EXISTS "Alunos podem ver suas próprias redações de simulado" ON public.redacoes_simulado;

CREATE POLICY "Usuários podem ver redações com seu email" 
  ON public.redacoes_simulado 
  FOR SELECT 
  USING (true); -- Permitir leitura, controle será feito na aplicação

-- Criar política para admins visualizarem todas as redações de simulado
CREATE POLICY "Admins podem ver todas as redações de simulado" 
  ON public.redacoes_simulado 
  FOR ALL 
  USING (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE id = auth.uid() 
      AND email = 'jardsonbrito@gmail.com'
    )
  );

-- Política para permitir inserção de redações de simulado
DROP POLICY IF EXISTS "Alunos podem inserir redações de simulado" ON public.redacoes_simulado;

CREATE POLICY "Qualquer um pode inserir redações de simulado" 
  ON public.redacoes_simulado 
  FOR INSERT 
  WITH CHECK (true);

-- Comentários atualizados
COMMENT ON COLUMN public.redacoes_simulado.dados_visitante IS 'Dados JSON do visitante quando aplicável';
COMMENT ON COLUMN public.simulados.permite_visitante IS 'Se true, visitantes podem participar do simulado';
