-- Execute este SQL primeiro para verificar se a tabela credit_audit existe
-- e quais são suas constraints atuais

-- 1. Verificar se a tabela credit_audit existe
SELECT EXISTS (
    SELECT FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name = 'credit_audit'
);

-- 2. Se existir, mostrar sua estrutura
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'credit_audit'
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 3. Mostrar constraints atuais
SELECT
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name,
    rc.delete_rule
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
LEFT JOIN information_schema.referential_constraints AS rc
    ON tc.constraint_name = rc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_name = 'credit_audit';