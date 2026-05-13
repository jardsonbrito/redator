-- Turmas alvo para notificações inbox
ALTER TABLE public.inbox_messages
  ADD COLUMN IF NOT EXISTS turmas_alvo TEXT[];

COMMENT ON COLUMN public.inbox_messages.turmas_alvo IS 'Turmas que devem receber esta mensagem. null = todas as turmas';
