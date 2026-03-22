-- Criar tabela para configurações gerais do sistema Jarvis (mensagens personalizáveis)
CREATE TABLE IF NOT EXISTS jarvis_system_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chave TEXT UNIQUE NOT NULL,
  valor TEXT NOT NULL,
  descricao TEXT,
  atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Inserir mensagens padrão
INSERT INTO jarvis_system_config (chave, valor, descricao) VALUES
  ('mensagem_sem_config', 'O Jarvis está sendo configurado pela equipe pedagógica. Em breve esta funcionalidade estará disponível!', 'Mensagem exibida quando não há configuração ativa'),
  ('mensagem_erro_verificacao', 'Não foi possível carregar o Jarvis no momento. Tente novamente em instantes.', 'Mensagem exibida quando há erro ao verificar disponibilidade')
ON CONFLICT (chave) DO NOTHING;

-- Habilitar RLS
ALTER TABLE jarvis_system_config ENABLE ROW LEVEL SECURITY;

-- Policy para leitura (todos podem ler, incluindo não autenticados)
DROP POLICY IF EXISTS "Usuários autenticados podem ver configurações do sistema Jarvis" ON jarvis_system_config;
CREATE POLICY "Todos podem ler configurações do sistema Jarvis"
  ON jarvis_system_config FOR SELECT
  USING (true);

-- Policy para admin atualizar
CREATE POLICY "Admin pode atualizar configurações do sistema Jarvis"
  ON jarvis_system_config FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE email = auth.jwt() ->> 'email'
      AND ativo = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE email = auth.jwt() ->> 'email'
      AND ativo = true
    )
  );
