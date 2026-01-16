-- ============================================
-- MIGRATION: Adicionar Ponto de Atenção (PA)
-- ============================================
-- Este script atualiza a constraint da tabela marcacoes_visuais
-- para aceitar a competência 6 (Ponto de Atenção)
--
-- INSTRUÇÕES PARA APLICAR:
-- 1. Acesse https://supabase.com/dashboard
-- 2. Selecione seu projeto
-- 3. Vá em "SQL Editor"
-- 4. Cole este script completo
-- 5. Execute (Run)
-- ============================================

-- Remover constraint antiga que só permitia valores de 1 a 5
ALTER TABLE public.marcacoes_visuais
  DROP CONSTRAINT IF EXISTS marcacoes_visuais_competencia_check;

-- Adicionar nova constraint que aceita valores de 1 a 6
ALTER TABLE public.marcacoes_visuais
  ADD CONSTRAINT marcacoes_visuais_competencia_check
  CHECK (competencia BETWEEN 1 AND 6);

-- Adicionar comentário explicativo na coluna
COMMENT ON COLUMN public.marcacoes_visuais.competencia IS
  'Competência ENEM: 1-5 = Competências padrão, 6 = Ponto de Atenção (PA)';

-- Verificar se a constraint foi atualizada corretamente
SELECT
  conname as constraint_name,
  pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint
WHERE conrelid = 'public.marcacoes_visuais'::regclass
  AND conname = 'marcacoes_visuais_competencia_check';

-- Mensagem de sucesso
SELECT 'Migration aplicada com sucesso! Agora você pode usar a competência 6 (PA).' as status;
