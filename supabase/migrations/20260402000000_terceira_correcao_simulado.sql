-- Migration: Terceira correção de simulado
-- Adiciona campos para suportar o fluxo de terceira correção pelo admin
-- quando há discrepância entre os dois corretores iniciais.
--
-- Regras de discrepância:
--   • Critério A (total): |nota_final_corretor_1 - nota_final_corretor_2| > 100
--   • Critério B (competência): diferença em qualquer Cx > 80
--   • Ambos os critérios são independentes (operador OU)
--
-- Fluxo após discrepância:
--   1. status_terceira_correcao = 'pendente'  (auto, ao detectar discrepância)
--   2. Admin insere notas → status_terceira_correcao = 'salva'  (corrigida ainda false)
--   3. Admin clica "Finalizar e liberar nota" → corrigida = true, status_terceira_correcao = 'concluida'
--
-- Cálculo da nota final: média das duas notas totais mais próximas entre
--   corretor_1, corretor_2 e admin. Par escolhido registrado em par_utilizado.
--   Empate de diferenças: prioridade 1_2 > 1_admin > 2_admin
--   (decisão deliberada de negócio: preservar os dois corretores originais em empate)

ALTER TABLE redacoes_simulado
  ADD COLUMN IF NOT EXISTS c1_admin                  numeric,
  ADD COLUMN IF NOT EXISTS c2_admin                  numeric,
  ADD COLUMN IF NOT EXISTS c3_admin                  numeric,
  ADD COLUMN IF NOT EXISTS c4_admin                  numeric,
  ADD COLUMN IF NOT EXISTS c5_admin                  numeric,
  ADD COLUMN IF NOT EXISTS nota_final_admin           numeric,
  ADD COLUMN IF NOT EXISTS status_terceira_correcao  text,
  ADD COLUMN IF NOT EXISTS data_terceira_correcao    timestamptz,
  ADD COLUMN IF NOT EXISTS par_utilizado             text;

-- Constraints de domínio: garante valores válidos por qualquer origem

ALTER TABLE redacoes_simulado
  ADD CONSTRAINT chk_c1_admin CHECK (c1_admin IS NULL OR c1_admin IN (0,40,80,120,160,200)),
  ADD CONSTRAINT chk_c2_admin CHECK (c2_admin IS NULL OR c2_admin IN (0,40,80,120,160,200)),
  ADD CONSTRAINT chk_c3_admin CHECK (c3_admin IS NULL OR c3_admin IN (0,40,80,120,160,200)),
  ADD CONSTRAINT chk_c4_admin CHECK (c4_admin IS NULL OR c4_admin IN (0,40,80,120,160,200)),
  ADD CONSTRAINT chk_c5_admin CHECK (c5_admin IS NULL OR c5_admin IN (0,40,80,120,160,200)),
  ADD CONSTRAINT chk_nota_final_admin CHECK (nota_final_admin IS NULL OR (nota_final_admin >= 0 AND nota_final_admin <= 1000)),
  ADD CONSTRAINT chk_status_terceira_correcao CHECK (
    status_terceira_correcao IS NULL OR
    status_terceira_correcao IN ('pendente', 'salva', 'concluida')
  ),
  ADD CONSTRAINT chk_par_utilizado CHECK (
    par_utilizado IS NULL OR
    par_utilizado IN ('1_2', '1_admin', '2_admin')
  ),
  -- Impede que notas do admin sejam preenchidas sem o status correspondente ativo.
  -- Esta é a trava de último recurso caso as camadas de aplicação falhem.
  ADD CONSTRAINT chk_admin_notas_requer_status CHECK (
    (c1_admin IS NULL AND status_terceira_correcao IS NULL)
    OR
    (c1_admin IS NOT NULL AND status_terceira_correcao IS NOT NULL)
  );

COMMENT ON COLUMN redacoes_simulado.status_terceira_correcao IS
  'null = sem discrepância; pendente = discrepância detectada, admin ainda não corrigiu; salva = admin inseriu notas mas não liberou; concluida = nota liberada ao aluno';

COMMENT ON COLUMN redacoes_simulado.par_utilizado IS
  '1_2 = par corretor1+corretor2; 1_admin = par corretor1+admin; 2_admin = par corretor2+admin. Regra de empate: preferência 1_2 > 1_admin > 2_admin (decisão deliberada de negócio).';
