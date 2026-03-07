-- Migration: Suporte a aulas repetições (mesma aula pedagógica em dias diferentes)
-- Data: 2026-03-07

-- =============================================================================
-- PASSO 1: Nova coluna aula_mae_id em aulas_virtuais
-- =============================================================================

ALTER TABLE public.aulas_virtuais
ADD COLUMN IF NOT EXISTS aula_mae_id UUID
  REFERENCES public.aulas_virtuais(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_aulas_virtuais_aula_mae_id
  ON public.aulas_virtuais(aula_mae_id);

-- =============================================================================
-- PASSO 2: Atualizar trigger criar_aulas_diario_automatico
-- - Se for repetição (aula_mae_id NOT NULL): não criar entrada no diário
-- - Remover texto "Aula ao vivo criada automaticamente" do campo observacoes
-- =============================================================================

CREATE OR REPLACE FUNCTION public.criar_aulas_diario_automatico()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_turma TEXT;
  v_etapa_id UUID;
  v_turma_normalizada TEXT;
BEGIN
  -- Só processar se for aula ao vivo
  IF NEW.eh_aula_ao_vivo IS NOT TRUE THEN
    RETURN NEW;
  END IF;

  -- Se for uma repetição de outra aula, não criar nova entrada no diário
  -- (a entrada já existe para a aula mãe)
  IF NEW.aula_mae_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

  -- Para cada turma autorizada, criar uma entrada no diário
  FOREACH v_turma IN ARRAY NEW.turmas_autorizadas
  LOOP
    -- Pular "Todas" ou valores vazios
    IF v_turma IS NULL OR v_turma = '' OR UPPER(v_turma) = 'TODAS' THEN
      CONTINUE;
    END IF;

    -- Normalizar turma
    v_turma_normalizada := UPPER(TRIM(v_turma));
    IF v_turma_normalizada LIKE 'TURMA %' THEN
      v_turma_normalizada := TRIM(SUBSTRING(v_turma_normalizada FROM 7));
    END IF;

    -- Buscar etapa vigente para esta turma na data da aula
    v_etapa_id := public.buscar_etapa_vigente(v_turma_normalizada, NEW.data_aula);

    -- Se não encontrar etapa, emitir warning e pular
    IF v_etapa_id IS NULL THEN
      RAISE WARNING 'Nenhuma etapa vigente encontrada para turma % na data %. Aula não criada no diário.',
        v_turma_normalizada, NEW.data_aula;
      CONTINUE;
    END IF;

    -- Verificar se já existe uma aula no diário para esta origem
    IF NOT EXISTS (
      SELECT 1 FROM public.aulas_diario
      WHERE origem_aula_virtual_id = NEW.id
        AND turma = v_turma_normalizada
    ) THEN
      -- Criar entrada no diário (sem preencher observacoes automaticamente)
      INSERT INTO public.aulas_diario (
        turma,
        data_aula,
        conteudo_ministrado,
        etapa_id,
        origem_aula_virtual_id,
        eh_aula_online,
        presenca_automatica
      ) VALUES (
        v_turma_normalizada,
        NEW.data_aula,
        NEW.titulo,
        v_etapa_id,
        NEW.id,
        TRUE,
        TRUE
      );

      RAISE NOTICE 'Aula criada no diário para turma % na etapa %', v_turma_normalizada, v_etapa_id;
    END IF;
  END LOOP;

  RETURN NEW;
END;
$$;

-- =============================================================================
-- PASSO 3: Atualizar trigger sincronizar_presenca_diario
-- - Usar COALESCE(aula_mae_id, aula_id) para buscar a entrada correta no diário
--   Assim, presença em qualquer sessão (mãe ou repetição) é sincronizada
--   para o mesmo registro de diário
-- =============================================================================

CREATE OR REPLACE FUNCTION public.sincronizar_presenca_diario()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_aula_diario_id UUID;
  v_aula_virtual RECORD;
  v_turma_aluno TEXT;
  v_turma_normalizada TEXT;
  v_origem_id UUID;
BEGIN
  -- Buscar informações da aula virtual
  SELECT * INTO v_aula_virtual
  FROM public.aulas_virtuais
  WHERE id = NEW.aula_id;

  -- Se não encontrar a aula virtual, ou não for aula ao vivo, ignorar
  IF v_aula_virtual.id IS NULL OR v_aula_virtual.eh_aula_ao_vivo IS NOT TRUE THEN
    RETURN NEW;
  END IF;

  -- Determinar o id de origem para busca no diário:
  -- Se for repetição (aula_mae_id NOT NULL), usar a aula mãe como origem
  -- Caso contrário, usar a própria aula
  v_origem_id := COALESCE(v_aula_virtual.aula_mae_id, NEW.aula_id);

  -- Obter e normalizar a turma do aluno
  v_turma_aluno := COALESCE(NEW.turma, 'VISITANTE');
  v_turma_normalizada := UPPER(TRIM(v_turma_aluno));
  IF v_turma_normalizada LIKE 'TURMA %' THEN
    v_turma_normalizada := TRIM(SUBSTRING(v_turma_normalizada FROM 7));
  END IF;

  -- Buscar a aula correspondente no diário (pela aula mãe ou pela própria aula)
  SELECT id INTO v_aula_diario_id
  FROM public.aulas_diario
  WHERE origem_aula_virtual_id = v_origem_id
    AND turma = v_turma_normalizada
  LIMIT 1;

  -- Se não encontrar aula no diário, ignorar (pode ser turma sem etapa)
  IF v_aula_diario_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- UPSERT na tabela de presença do diário
  INSERT INTO public.presenca_participacao_diario (
    aula_id,
    aluno_email,
    turma,
    presente,
    participou,
    observacoes_aluno
  ) VALUES (
    v_aula_diario_id,
    LOWER(TRIM(NEW.email_aluno)),
    v_turma_normalizada,
    -- Aluno está presente se registrou entrada
    (NEW.entrada_at IS NOT NULL),
    -- Aluno participou se registrou saída (indica que ficou até o fim)
    (NEW.saida_at IS NOT NULL),
    'Presença registrada automaticamente via aula ao vivo'
  )
  ON CONFLICT (aula_id, aluno_email)
  DO UPDATE SET
    presente = (NEW.entrada_at IS NOT NULL),
    participou = (NEW.saida_at IS NOT NULL),
    updated_at = NOW();

  RETURN NEW;
END;
$$;

-- =============================================================================
-- PASSO 4: Atualizar RPC update_aula_virtual_safe
-- - Adicionar parâmetro p_aula_mae_id (UUID, padrão NULL)
-- =============================================================================

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
BEGIN
  -- Verificar se usuário é admin
  IF NOT public.is_main_admin() THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

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
END;
$$;
