-- ============================================================
-- Adiciona "Calendário" como funcionalidade configurável
-- Data: 2026-06-08
-- Objetivo: Permitir que o admin libere/restrinja a exibição do
-- calendário de atividades no painel do professor (globalmente
-- via "Funcionalidades" e por plano via "Cards liberados").
-- Habilitado por padrão para preservar o comportamento atual.
-- ============================================================

BEGIN;

INSERT INTO public.funcionalidades
  (chave, nome_exibicao, descricao, sempre_disponivel, ordem_aluno, ordem_professor, habilitado_professor, ativo)
VALUES
  ('calendario', 'Calendário', 'Calendário de atividades exibido no painel do professor',
   false, 25, 25, true, true)
ON CONFLICT (chave) DO NOTHING;

COMMIT;
