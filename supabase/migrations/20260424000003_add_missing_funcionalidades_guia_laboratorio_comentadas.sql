-- Registra as 3 funcionalidades que existem no app mas estavam ausentes
-- da tabela funcionalidades e portanto não apareciam no PlansManager.
--
-- Todas habilitadas em todos os planos por padrão (reflete o estado atual
-- onde esses cards aparecem para todos). O admin pode ajustar no painel.

INSERT INTO public.funcionalidades
  (chave, nome_exibicao, descricao, sempre_disponivel, ordem_aluno, ativo)
VALUES
  ('guia_tematico',          'Guia Temático',           'Roteiro completo de aprofundamento sobre a frase temática', false, 20, true),
  ('laboratorio_repertorio', 'Laboratório de Repertório','Aulas em 3 etapas: Contexto → Repertório → Aplicação',      false, 21, true),
  ('redacoes_comentadas',    'Redações Comentadas',      'Redações com comentários detalhados e anotações por trecho', false, 22, true)
ON CONFLICT (chave) DO NOTHING;

-- Habilitar em todos os planos ativos (estado atual: sempre visível)
DO $$
DECLARE
  v_plano RECORD;
  v_func  RECORD;
BEGIN
  FOR v_plano IN SELECT id FROM public.planos LOOP
    FOR v_func IN
      SELECT id FROM public.funcionalidades
      WHERE chave IN ('guia_tematico', 'laboratorio_repertorio', 'redacoes_comentadas')
    LOOP
      INSERT INTO public.plano_funcionalidades (plano_id, funcionalidade_id, habilitado)
      VALUES (v_plano.id, v_func.id, true)
      ON CONFLICT (plano_id, funcionalidade_id) DO NOTHING;
    END LOOP;
  END LOOP;
END;
$$;

-- Habilitar para visitante (false por padrão — admin ajusta se quiser)
INSERT INTO public.visitante_funcionalidades (funcionalidade_id, habilitado)
SELECT id, false
FROM public.funcionalidades
WHERE chave IN ('guia_tematico', 'laboratorio_repertorio', 'redacoes_comentadas')
ON CONFLICT (funcionalidade_id) DO NOTHING;
