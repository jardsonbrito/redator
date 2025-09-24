-- Migration para resolver problema de exclusão de alunos
-- Adicionar ON DELETE CASCADE na tabela credit_audit para permitir exclusão de profiles

-- 1. Remover constraint existente se houver
ALTER TABLE IF EXISTS public.credit_audit
  DROP CONSTRAINT IF EXISTS credit_audit_user_id_fkey;

ALTER TABLE IF EXISTS public.credit_audit
  DROP CONSTRAINT IF EXISTS credit_audit_admin_id_fkey;

-- 2. Recriar constraints com ON DELETE CASCADE
-- Para user_id (permite excluir o usuário e remover automaticamente seus registros de auditoria)
ALTER TABLE IF EXISTS public.credit_audit
  ADD CONSTRAINT credit_audit_user_id_fkey
  FOREIGN KEY (user_id)
  REFERENCES public.profiles(id)
  ON DELETE CASCADE;

-- Para admin_id (permite excluir o admin e manter os registros de auditoria com admin_id NULL)
ALTER TABLE IF EXISTS public.credit_audit
  ADD CONSTRAINT credit_audit_admin_id_fkey
  FOREIGN KEY (admin_id)
  REFERENCES public.profiles(id)
  ON DELETE SET NULL;

-- 3. Verificar outras tabelas que possam ter constraints similares
-- Email change audit
ALTER TABLE IF EXISTS public.email_change_audit
  DROP CONSTRAINT IF EXISTS email_change_audit_user_id_fkey;

ALTER TABLE IF EXISTS public.email_change_audit
  ADD CONSTRAINT email_change_audit_user_id_fkey
  FOREIGN KEY (user_id)
  REFERENCES public.profiles(id)
  ON DELETE CASCADE;

-- 4. Verificar tabelas de redações
-- Redações enviadas (se houver referência direta a profiles)
DO $$
BEGIN
  -- Verificar se existe coluna email_aluno que deveria ser user_id
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'redacoes_enviadas'
    AND column_name = 'user_id'
  ) THEN
    ALTER TABLE public.redacoes_enviadas
      DROP CONSTRAINT IF EXISTS redacoes_enviadas_user_id_fkey;

    ALTER TABLE public.redacoes_enviadas
      ADD CONSTRAINT redacoes_enviadas_user_id_fkey
      FOREIGN KEY (user_id)
      REFERENCES public.profiles(id)
      ON DELETE CASCADE;
  END IF;
END $$;

-- 5. Redações de simulado (se houver referência direta a profiles)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'redacoes_simulado'
    AND column_name = 'user_id'
  ) THEN
    ALTER TABLE public.redacoes_simulado
      DROP CONSTRAINT IF EXISTS redacoes_simulado_user_id_fkey;

    ALTER TABLE public.redacoes_simulado
      ADD CONSTRAINT redacoes_simulado_user_id_fkey
      FOREIGN KEY (user_id)
      REFERENCES public.profiles(id)
      ON DELETE CASCADE;
  END IF;
END $$;

-- 6. Redações de exercício (se houver referência direta a profiles)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'redacoes_exercicio'
    AND column_name = 'user_id'
  ) THEN
    ALTER TABLE public.redacoes_exercicio
      DROP CONSTRAINT IF EXISTS redacoes_exercicio_user_id_fkey;

    ALTER TABLE public.redacoes_exercicio
      ADD CONSTRAINT redacoes_exercicio_user_id_fkey
      FOREIGN KEY (user_id)
      REFERENCES public.profiles(id)
      ON DELETE CASCADE;
  END IF;
END $$;

-- 7. Adicionar comentários para documentação
COMMENT ON TABLE public.credit_audit IS 'Tabela de auditoria de créditos - registros são removidos automaticamente quando o usuário é excluído';

-- 8. Criar índices para performance (se não existirem)
CREATE INDEX IF NOT EXISTS idx_credit_audit_user_id ON public.credit_audit(user_id);
CREATE INDEX IF NOT EXISTS idx_credit_audit_admin_id ON public.credit_audit(admin_id);