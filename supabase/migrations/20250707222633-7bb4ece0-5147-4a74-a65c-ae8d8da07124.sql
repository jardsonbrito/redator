-- Criar bucket para redações manuscritas se não existir
INSERT INTO storage.buckets (id, name, public) 
VALUES ('redacoes-manuscritas', 'redacoes-manuscritas', true)
ON CONFLICT (id) DO NOTHING;

-- Criar políticas de acesso para o bucket de redações manuscritas
-- Permitir inserção para usuários autenticados
INSERT INTO storage.policies (id, bucket_id, command, definition, check_)
VALUES (
  'redacoes-manuscritas-insert',
  'redacoes-manuscritas',
  'INSERT',
  '(bucket_id = ''redacoes-manuscritas'')',
  'true'
)
ON CONFLICT (id) DO UPDATE SET
  bucket_id = EXCLUDED.bucket_id,
  command = EXCLUDED.command,
  definition = EXCLUDED.definition,
  check_ = EXCLUDED.check_;

-- Permitir visualização pública
INSERT INTO storage.policies (id, bucket_id, command, definition)
VALUES (
  'redacoes-manuscritas-select',
  'redacoes-manuscritas',
  'SELECT',
  '(bucket_id = ''redacoes-manuscritas'')'
)
ON CONFLICT (id) DO UPDATE SET
  bucket_id = EXCLUDED.bucket_id,
  command = EXCLUDED.command,
  definition = EXCLUDED.definition;

-- Permitir atualização para admins
INSERT INTO storage.policies (id, bucket_id, command, definition, check_)
VALUES (
  'redacoes-manuscritas-update',
  'redacoes-manuscritas',
  'UPDATE',
  '(bucket_id = ''redacoes-manuscritas'')',
  'is_main_admin()'
)
ON CONFLICT (id) DO UPDATE SET
  bucket_id = EXCLUDED.bucket_id,
  command = EXCLUDED.command,
  definition = EXCLUDED.definition,
  check_ = EXCLUDED.check_;

-- Permitir deleção para admins
INSERT INTO storage.policies (id, bucket_id, command, definition)
VALUES (
  'redacoes-manuscritas-delete',
  'redacoes-manuscritas',
  'DELETE',
  '(bucket_id = ''redacoes-manuscritas'' AND is_main_admin())'
)
ON CONFLICT (id) DO UPDATE SET
  bucket_id = EXCLUDED.bucket_id,
  command = EXCLUDED.command,
  definition = EXCLUDED.definition;