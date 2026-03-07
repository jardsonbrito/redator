-- Migration: Migração retroativa ao vincular aula existente como repetição
-- Quando update_aula_virtual_safe recebe aula_mae_id pela primeira vez (era NULL),
-- migra automaticamente as entradas do diário e as presenças já registradas.

CREATE OR REPLACE FUNCTION public.update_aula_virtual_safe(
  p_aula_id UUID,
  p_titulo TEXT,
  p_descricao TEXT,
  p_data_aula DATE,
  p_horario_inicio TIME,
  p_horario_fim TIME,
  p_turmas_autorizadas TEXT[],
  p_imagem_capa_url TEXT,
  p_link_meet TEXT,
  p_abrir_aba_externa BOOLEAN,
  p_permite_visitante BOOLEAN,
  p_ativo BOOLEAN,
  p_eh_aula_ao_vivo BOOLEAN,
  p_aula_mae_id UUID DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_old_aula_mae_id UUID;
  v_diario_rep RECORD;
  v_diario_mae_id UUID;
BEGIN
  IF NOT public.is_main_admin() THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  -- Guardar o aula_mae_id atual ANTES do update para detectar mudança
  SELECT aula_mae_id INTO v_old_aula_mae_id
  FROM public.aulas_virtuais
  WHERE id = p_aula_id;

  -- Atualizar o registro
  UPDATE public.aulas_virtuais
  SET
    titulo = p_titulo,
    descricao = p_descricao,
    data_aula = p_data_aula,
    horario_inicio = p_horario_inicio,
    horario_fim = p_horario_fim,
    turmas_autorizadas = p_turmas_autorizadas,
    imagem_capa_url = p_imagem_capa_url,
    link_meet = p_link_meet,
    abrir_aba_externa = p_abrir_aba_externa,
    permite_visitante = p_permite_visitante,
    ativo = p_ativo,
    eh_aula_ao_vivo = p_eh_aula_ao_vivo,
    aula_mae_id = p_aula_mae_id,
    atualizado_em = now()
  WHERE id = p_aula_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Aula não encontrada';
  END IF;

  -- ============================================================
  -- MIGRAÇÃO RETROATIVA
  -- Só executa quando aula_mae_id está sendo definido pela
  -- primeira vez (transição NULL → valor), ou seja, quando uma
  -- aula já existente está sendo vinculada como repetição.
  -- ============================================================
  IF p_aula_mae_id IS NOT NULL AND v_old_aula_mae_id IS NULL THEN

    -- Para cada entrada no diário vinculada a esta aula (agora repetição)
    FOR v_diario_rep IN
      SELECT id, turma
      FROM public.aulas_diario
      WHERE origem_aula_virtual_id = p_aula_id
    LOOP
      -- Buscar a entrada correspondente no diário da aula mãe (mesma turma)
      SELECT id INTO v_diario_mae_id
      FROM public.aulas_diario
      WHERE origem_aula_virtual_id = p_aula_mae_id
        AND turma = v_diario_rep.turma
      LIMIT 1;

      IF v_diario_mae_id IS NOT NULL THEN
        -- Migrar presenças para a entrada da mãe
        -- Lógica OR: presença em qualquer sessão conta como presente
        INSERT INTO public.presenca_participacao_diario (
          aula_id,
          aluno_email,
          turma,
          presente,
          participou,
          observacoes_aluno
        )
        SELECT
          v_diario_mae_id,
          aluno_email,
          turma,
          presente,
          participou,
          observacoes_aluno
        FROM public.presenca_participacao_diario
        WHERE aula_id = v_diario_rep.id
        ON CONFLICT (aula_id, aluno_email)
        DO UPDATE SET
          -- OR: se estava presente em qualquer sessão, continua presente
          presente  = EXCLUDED.presente  OR presenca_participacao_diario.presente,
          participou = EXCLUDED.participou OR presenca_participacao_diario.participou,
          updated_at = NOW();
      END IF;

      -- Remover a entrada duplicada do diário
      -- (presenças já migradas para o diário da mãe)
      DELETE FROM public.aulas_diario
      WHERE id = v_diario_rep.id;

    END LOOP;

  END IF;
END;
$$;
