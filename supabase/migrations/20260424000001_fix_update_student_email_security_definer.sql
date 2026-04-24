-- Corrige update_student_email:
-- 1. Adiciona SECURITY DEFINER (corrige erro 403/RLS em email_change_audit)
-- 2. Cobre TODAS as tabelas com email do aluno (evita perda de histórico)
-- Ver migration 20260424000002 para a versão com cobertura completa.

-- (esta migration foi supersedida por 20260424000002_fix_update_student_email_complete_coverage.sql)
