# Execute este SQL no Supabase

## Passo 1: Acesse o SQL Editor do Supabase

1. Acesse https://supabase.com/dashboard
2. Selecione seu projeto
3. Vá em **SQL Editor** (no menu lateral)
4. Clique em **New query**

## Passo 2: Cole e execute este SQL:

```sql
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

-- Policy para leitura (todos autenticados podem ler)
CREATE POLICY "Usuários autenticados podem ver configurações do sistema Jarvis"
  ON jarvis_system_config FOR SELECT
  TO authenticated
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
```

## Passo 3: Clique em "Run" (F5)

Você deve ver: **Success. No rows returned**

## Como usar:

1. **Como Admin**, acesse o dashboard
2. Clique no card **"Jarvis"**
3. Vá para a aba **"Configurações"**
4. Role a página para baixo
5. Você verá o card **"Mensagens do Sistema"**
6. Edite as mensagens:
   - **Mensagem quando não há configuração ativa**: Aparece quando você ainda não criou nenhuma configuração ou desativou todas
   - **Mensagem quando há erro ao carregar**: Aparece quando há problema de conexão ou erro no banco
7. Clique em **"Salvar Mensagens"**

## Resultado:

Os alunos verão suas mensagens personalizadas ao invés das mensagens padrão hardcoded!

✅ Implementação concluída e enviada para o GitHub.
