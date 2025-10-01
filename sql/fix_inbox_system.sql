-- Script para corrigir o sistema de inbox e criar dados de teste
-- Execute este script diretamente no Supabase Dashboard > SQL Editor

-- 1. CORRIGIR RLS POLICIES
-- Remover policies problemáticas
DROP POLICY IF EXISTS "Students can view their own inbox messages" ON inbox_recipients;
DROP POLICY IF EXISTS "Students can update their own inbox message status" ON inbox_recipients;

-- Como os alunos usam autenticação customizada (não Supabase Auth),
-- precisamos usar policies mais abertas ou desabilitar RLS temporariamente

-- Opção 1: Desabilitar RLS temporariamente para permitir acesso
ALTER TABLE inbox_recipients DISABLE ROW LEVEL SECURITY;
ALTER TABLE inbox_messages DISABLE ROW LEVEL SECURITY;

-- Opção 2: Criar policies que sempre permitem acesso (descomentar se preferir manter RLS)
-- CREATE POLICY "Allow all access to inbox recipients" ON inbox_recipients FOR ALL USING (true);
-- CREATE POLICY "Allow all access to inbox messages" ON inbox_messages FOR ALL USING (true);

-- 2. CRIAR DADOS DE TESTE
-- Inserir mensagem de teste amigável
INSERT INTO inbox_messages (message, type, valid_until, extra_link, extra_image, created_by)
SELECT
    'Bem-vindo ao sistema de inbox! Esta é uma mensagem de teste para verificar se o sistema está funcionando corretamente. 🎉' as message,
    'amigavel' as type,
    NULL as valid_until,
    NULL as extra_link,
    NULL as extra_image,
    id as created_by
FROM admin_users
LIMIT 1;

-- Inserir recipients para o email de teste (patric.eu@gmail.com)
INSERT INTO inbox_recipients (message_id, student_email, status)
SELECT
    id as message_id,
    'patric.eu@gmail.com' as student_email,
    'pendente' as status
FROM inbox_messages
WHERE message LIKE 'Bem-vindo ao sistema de inbox%'
ORDER BY created_at DESC
LIMIT 1;

-- Inserir uma segunda mensagem de teste (bloqueante)
INSERT INTO inbox_messages (message, type, valid_until, extra_link, extra_image, created_by)
SELECT
    'ATENÇÃO: Esta é uma mensagem bloqueante de teste. Você precisa responder para continuar navegando na plataforma.' as message,
    'bloqueante' as type,
    NULL as valid_until,
    NULL as extra_link,
    NULL as extra_image,
    id as created_by
FROM admin_users
LIMIT 1;

-- Inserir recipient para a mensagem bloqueante
INSERT INTO inbox_recipients (message_id, student_email, status)
SELECT
    id as message_id,
    'patric.eu@gmail.com' as student_email,
    'pendente' as status
FROM inbox_messages
WHERE message LIKE 'ATENÇÃO: Esta é uma mensagem bloqueante%'
ORDER BY created_at DESC
LIMIT 1;

-- 3. VERIFICAR DADOS CRIADOS
-- Mostrar mensagens criadas
SELECT
    im.id,
    im.message,
    im.type,
    im.created_at,
    COUNT(ir.id) as total_recipients
FROM inbox_messages im
LEFT JOIN inbox_recipients ir ON im.id = ir.message_id
GROUP BY im.id, im.message, im.type, im.created_at
ORDER BY im.created_at DESC
LIMIT 5;

-- Mostrar recipients criados
SELECT
    ir.id,
    ir.student_email,
    ir.status,
    im.message,
    im.type
FROM inbox_recipients ir
JOIN inbox_messages im ON ir.message_id = im.id
WHERE ir.student_email = 'patric.eu@gmail.com'
ORDER BY im.created_at DESC;