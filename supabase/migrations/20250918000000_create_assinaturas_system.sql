-- Migração: Sistema completo de assinaturas
-- Data: 2025-09-18
-- Descrição: Cria tabela assinaturas, histórico e funções RPC necessárias

-- Criar tabela assinaturas
CREATE TABLE IF NOT EXISTS public.assinaturas (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  aluno_id uuid NOT NULL,
  plano text NOT NULL CHECK (plano IN ('Liderança', 'Lapidação', 'Largada')),
  data_inscricao date NOT NULL DEFAULT CURRENT_DATE,
  data_validade date NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,

  -- Constraint para garantir que aluno_id existe na tabela profiles
  CONSTRAINT fk_assinaturas_aluno
    FOREIGN KEY (aluno_id)
    REFERENCES public.profiles(id)
    ON DELETE CASCADE
);

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_assinaturas_aluno_id ON public.assinaturas(aluno_id);
CREATE INDEX IF NOT EXISTS idx_assinaturas_data_validade ON public.assinaturas(data_validade);
CREATE INDEX IF NOT EXISTS idx_assinaturas_plano ON public.assinaturas(plano);

-- Criar tabela para histórico de alterações
CREATE TABLE IF NOT EXISTS public.subscription_history (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  aluno_id uuid NOT NULL,
  alteracao text NOT NULL,
  data_alteracao timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  admin_responsavel text NOT NULL,

  -- Foreign key para profiles
  CONSTRAINT fk_subscription_history_aluno
    FOREIGN KEY (aluno_id)
    REFERENCES public.profiles(id)
    ON DELETE CASCADE
);

-- Índice para histórico
CREATE INDEX IF NOT EXISTS idx_subscription_history_aluno_id ON public.subscription_history(aluno_id);
CREATE INDEX IF NOT EXISTS idx_subscription_history_data ON public.subscription_history(data_alteracao);

-- Função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger para updated_at na tabela assinaturas
CREATE TRIGGER update_assinaturas_updated_at
  BEFORE UPDATE ON public.assinaturas
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Função RPC para criar tabela se não existir (usada pelo hook)
CREATE OR REPLACE FUNCTION public.create_assinaturas_table_if_not_exists()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- A tabela já foi criada acima, então sempre retorna sucesso
  RETURN 'table_exists_or_created';
EXCEPTION
  WHEN OTHERS THEN
    RETURN 'error: ' || SQLERRM;
END;
$$;

-- RLS (Row Level Security) para assinaturas
ALTER TABLE public.assinaturas ENABLE ROW LEVEL SECURITY;

-- Política: Admins podem ver e modificar tudo
CREATE POLICY "Admins can manage all subscriptions" ON public.assinaturas
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND user_type = 'admin'
    )
  );

-- Política: Alunos só podem ver suas próprias assinaturas
CREATE POLICY "Students can view own subscription" ON public.assinaturas
  FOR SELECT USING (
    aluno_id IN (
      SELECT p.id FROM public.profiles p
      WHERE p.email = auth.email()
      AND p.user_type = 'aluno'
    )
  );

-- RLS para histórico
ALTER TABLE public.subscription_history ENABLE ROW LEVEL SECURITY;

-- Política: Admins podem ver todo o histórico
CREATE POLICY "Admins can view all subscription history" ON public.subscription_history
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND user_type = 'admin'
    )
  );

-- Política: Admins podem inserir no histórico
CREATE POLICY "Admins can insert subscription history" ON public.subscription_history
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND user_type = 'admin'
    )
  );

-- Inserir dados de exemplo (se necessário para testes)
-- Descomente as linhas abaixo apenas para ambiente de desenvolvimento

/*
-- Exemplo de assinatura para teste
INSERT INTO public.assinaturas (aluno_id, plano, data_inscricao, data_validade)
SELECT
  p.id,
  'Liderança',
  '2025-02-03',
  '2025-12-31'
FROM public.profiles p
WHERE p.user_type = 'aluno'
AND NOT EXISTS (SELECT 1 FROM public.assinaturas WHERE aluno_id = p.id)
LIMIT 1;
*/

-- Comentários para documentação
COMMENT ON TABLE public.assinaturas IS 'Tabela de assinaturas dos alunos com planos e datas de validade';
COMMENT ON TABLE public.subscription_history IS 'Histórico de alterações nas assinaturas para auditoria';
COMMENT ON FUNCTION public.create_assinaturas_table_if_not_exists() IS 'Função RPC para verificar/criar tabela assinaturas (compatibilidade com hook)';