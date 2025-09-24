-- SQL CORRIGIDO para resolver exclusão de alunos
-- Execute cada bloco separadamente no SQL Editor do Supabase

-- 1. Corrigir constraint da tabela credit_audit para user_id
ALTER TABLE public.credit_audit
DROP CONSTRAINT IF EXISTS credit_audit_user_id_fkey;

ALTER TABLE public.credit_audit
ADD CONSTRAINT credit_audit_user_id_fkey
FOREIGN KEY (user_id)
REFERENCES public.profiles(id)
ON DELETE CASCADE;