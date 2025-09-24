-- 🚨 EXECUTE NO SQL EDITOR DO SUPABASE PARA CORRIGIR EXCLUSÃO DE ALUNOS
-- Este SQL resolve o problema de foreign key constraint que impede exclusão

-- 1. Corrigir constraint da tabela credit_audit
ALTER TABLE IF EXISTS public.credit_audit
  DROP CONSTRAINT IF EXISTS credit_audit_user_id_fkey;

ALTER TABLE IF EXISTS public.credit_audit
  ADD CONSTRAINT credit_audit_user_id_fkey
  FOREIGN KEY (user_id)
  REFERENCES public.profiles(id)
  ON DELETE CASCADE;

-- 2. Corrigir constraint de admin_id
ALTER TABLE IF EXISTS public.credit_audit
  DROP CONSTRAINT IF EXISTS credit_audit_admin_id_fkey;

ALTER TABLE IF EXISTS public.credit_audit
  ADD CONSTRAINT credit_audit_admin_id_fkey
  FOREIGN KEY (admin_id)
  REFERENCES public.profiles(id)
  ON DELETE SET NULL;

-- 3. Corrigir outras tabelas que possam ter o mesmo problema
ALTER TABLE IF EXISTS public.email_change_audit
  DROP CONSTRAINT IF EXISTS email_change_audit_user_id_fkey;

ALTER TABLE IF EXISTS public.email_change_audit
  ADD CONSTRAINT email_change_audit_user_id_fkey
  FOREIGN KEY (user_id)
  REFERENCES public.profiles(id)
  ON DELETE CASCADE;

-- 4. Verificar se há outras constraints problemáticas
SELECT
  tc.table_name,
  tc.constraint_name,
  kcu.column_name,
  ccu.table_name AS referenced_table,
  ccu.column_name AS referenced_column,
  rc.delete_rule
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage ccu
  ON ccu.constraint_name = tc.constraint_name
LEFT JOIN information_schema.referential_constraints rc
  ON tc.constraint_name = rc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND ccu.table_name = 'profiles'
  AND rc.delete_rule != 'CASCADE'
ORDER BY tc.table_name;

-- 5. Confirmar que as constraints foram atualizadas
SELECT
  tc.table_name,
  tc.constraint_name,
  rc.delete_rule
FROM information_schema.table_constraints tc
JOIN information_schema.referential_constraints rc
  ON tc.constraint_name = rc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.constraint_name LIKE '%user_id_fkey%';