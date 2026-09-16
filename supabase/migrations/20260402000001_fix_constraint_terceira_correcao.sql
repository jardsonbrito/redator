-- Corrige a constraint chk_admin_notas_requer_status que era restritiva demais.
-- A versão anterior exigia que c1_admin e status_terceira_correcao fossem
-- ambos nulos ou ambos preenchidos, o que impedia gravar status='pendente'
-- antes das notas do admin existirem.
--
-- Nova regra: apenas impede que as notas do admin sejam preenchidas sem
-- que o status correspondente esteja ativo. O campo status pode ser 'pendente'
-- com c1_admin ainda nulo (estado intermediário válido do fluxo).

ALTER TABLE redacoes_simulado DROP CONSTRAINT IF EXISTS chk_admin_notas_requer_status;

ALTER TABLE redacoes_simulado
  ADD CONSTRAINT chk_admin_notas_requer_status CHECK (
    c1_admin IS NULL OR status_terceira_correcao IS NOT NULL
  );
