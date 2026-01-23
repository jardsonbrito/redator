-- Criar tabela de configurações do sistema
CREATE TABLE IF NOT EXISTS public.configuracoes_sistema (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chave TEXT UNIQUE NOT NULL,
  valor JSONB NOT NULL DEFAULT '{}',
  descricao TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Inserir configuração padrão para autoatendimento por turma (todas habilitadas por padrão)
INSERT INTO public.configuracoes_sistema (chave, valor, descricao)
VALUES (
  'autoatendimento_turmas',
  '{"A": true, "B": true, "C": true, "D": true, "E": true, "F": true, "G": true, "H": true}'::jsonb,
  'Controla quais turmas têm o link de autoatendimento habilitado'
)
ON CONFLICT (chave) DO NOTHING;

-- Habilitar RLS
ALTER TABLE public.configuracoes_sistema ENABLE ROW LEVEL SECURITY;

-- Política para leitura pública (necessário para a página de cadastro verificar)
CREATE POLICY "Permitir leitura pública das configurações"
ON public.configuracoes_sistema
FOR SELECT
TO public
USING (true);

-- Política para admins atualizarem
CREATE POLICY "Admins podem atualizar configurações"
ON public.configuracoes_sistema
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.admin_users
    WHERE email = auth.jwt() ->> 'email'
  )
);

-- Política para admins inserirem (para upsert)
CREATE POLICY "Admins podem inserir configurações"
ON public.configuracoes_sistema
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.admin_users
    WHERE email = auth.jwt() ->> 'email'
  )
);

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_configuracoes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_configuracoes_updated_at
BEFORE UPDATE ON public.configuracoes_sistema
FOR EACH ROW
EXECUTE FUNCTION update_configuracoes_updated_at();
