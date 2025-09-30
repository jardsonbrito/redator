-- Migration para restaurar tabela credit_audit que foi removida incorretamente
-- Data: 2025-09-28

-- Recriar tabela credit_audit com estrutura correta
CREATE TABLE IF NOT EXISTS public.credit_audit (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  admin_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  old_credits INTEGER NOT NULL DEFAULT 0,
  new_credits INTEGER NOT NULL DEFAULT 0,
  amount INTEGER NOT NULL DEFAULT 0,
  action TEXT NOT NULL CHECK (action IN ('add', 'subtract', 'set')),
  description TEXT,
  reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_credit_audit_user_id ON public.credit_audit(user_id);
CREATE INDEX IF NOT EXISTS idx_credit_audit_admin_id ON public.credit_audit(admin_id);
CREATE INDEX IF NOT EXISTS idx_credit_audit_created_at ON public.credit_audit(created_at);

-- RLS (Row Level Security)
ALTER TABLE public.credit_audit ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Admins podem ver todos os registros de auditoria"
  ON public.credit_audit FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND user_type = 'admin'
    )
  );

CREATE POLICY "Usuários podem ver apenas seus próprios registros"
  ON public.credit_audit FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Apenas funções com SECURITY DEFINER podem inserir
CREATE POLICY "Apenas sistema pode inserir registros"
  ON public.credit_audit FOR INSERT
  TO authenticated
  WITH CHECK (false); -- Apenas via SECURITY DEFINER functions

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION update_credit_audit_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_credit_audit_updated_at
  BEFORE UPDATE ON public.credit_audit
  FOR EACH ROW
  EXECUTE FUNCTION update_credit_audit_updated_at();

-- Comentários
COMMENT ON TABLE public.credit_audit IS 'Tabela de auditoria para todas as operações de créditos';
COMMENT ON COLUMN public.credit_audit.action IS 'Tipo de ação: add (adicionar), subtract (subtrair), set (definir valor)';
COMMENT ON COLUMN public.credit_audit.amount IS 'Quantidade de créditos afetados (sempre positivo)';
COMMENT ON COLUMN public.credit_audit.description IS 'Descrição detalhada da operação';
COMMENT ON COLUMN public.credit_audit.reason IS 'Motivo da operação (ex: Envio de redação, Cancelamento, etc)';