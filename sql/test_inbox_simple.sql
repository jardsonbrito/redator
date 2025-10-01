-- Script de teste simples para verificar se as tabelas do inbox existem e funcionam

-- 1. Verificar se as tabelas existem
SELECT table_name FROM information_schema.tables
WHERE table_name IN ('inbox_messages', 'inbox_recipients')
AND table_schema = 'public';

-- 2. Verificar RLS status
SELECT
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables
WHERE tablename IN ('inbox_messages', 'inbox_recipients');

-- 3. Verificar se há dados nas tabelas
SELECT 'inbox_messages' as tabela, count(*) as total FROM inbox_messages
UNION ALL
SELECT 'inbox_recipients' as tabela, count(*) as total FROM inbox_recipients;

-- 4. Verificar se há admin users para usar como created_by
SELECT 'admin_users' as tabela, count(*) as total FROM admin_users;

-- 5. Inserir dados de teste mais simples (se as tabelas estiverem vazias)
-- Primeiro desabilitar RLS se ainda estiver ativo
ALTER TABLE inbox_messages DISABLE ROW LEVEL SECURITY;
ALTER TABLE inbox_recipients DISABLE ROW LEVEL SECURITY;

-- Inserir admin de teste se não existir
INSERT INTO admin_users (email, password_hash)
SELECT 'test@admin.com', 'dummy_hash'
WHERE NOT EXISTS (SELECT 1 FROM admin_users LIMIT 1);

-- Inserir mensagem de teste
INSERT INTO inbox_messages (message, type, created_by)
SELECT
    'Teste de mensagem do inbox - ' || current_timestamp,
    'amigavel',
    (SELECT id FROM admin_users LIMIT 1)
WHERE NOT EXISTS (
    SELECT 1 FROM inbox_messages
    WHERE message LIKE 'Teste de mensagem do inbox%'
);

-- Inserir recipient de teste
INSERT INTO inbox_recipients (message_id, student_email, status)
SELECT
    (SELECT id FROM inbox_messages WHERE message LIKE 'Teste de mensagem do inbox%' ORDER BY created_at DESC LIMIT 1),
    'patric.eu@gmail.com',
    'pendente'
WHERE NOT EXISTS (
    SELECT 1 FROM inbox_recipients
    WHERE student_email = 'patric.eu@gmail.com'
);

-- 6. Verificar dados finais
SELECT
    ir.id,
    ir.student_email,
    ir.status,
    im.message,
    im.type,
    im.created_at
FROM inbox_recipients ir
JOIN inbox_messages im ON ir.message_id = im.id
WHERE ir.student_email = 'patric.eu@gmail.com'
ORDER BY im.created_at DESC;