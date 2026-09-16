-- Migration: Integração Aulas Ao Vivo com Diário Online
-- Descrição: Cria presença automática quando alunos entram/saem de aulas ao vivo

-- =============================================================================
-- FASE 1: Novas colunas em aulas_diario
-- =============================================================================

-- Adicionar coluna para referenciar a aula virtual de origem
ALTER TABLE public.aulas_diario
ADD COLUMN IF NOT EXISTS origem_aula_virtual_id UUID REFERENCES public.aulas_virtuais(id) ON DELETE SET NULL;

-- Adicionar coluna para indicar se é uma aula online
ALTER TABLE public.aulas_diario
ADD COLUMN IF NOT EXISTS eh_aula_online BOOLEAN DEFAULT FALSE;

-- Adicionar coluna para indicar se a presença é automática
ALTER TABLE public.aulas_diario
ADD COLUMN IF NOT EXISTS presenca_automatica BOOLEAN DEFAULT FALSE;

-- Criar índice para busca por aula virtual de origem
CREATE INDEX IF NOT EXISTS idx_aulas_diario_origem_aula_virtual
ON public.aulas_diario(origem_aula_virtual_id);

-- =============================================================================
-- FASE 2: Função para buscar etapa vigente
-- =============================================================================

CREATE OR REPLACE FUNCTION public.buscar_etapa_vigente(
  p_turma TEXT,
  p_data DATE
)
RETURNS UUID
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_etapa_id UUID;
  v_turma_normalizada TEXT;
BEGIN
  -- Normalizar turma: extrair apenas a letra (A, B, C, etc)
  v_turma_normalizada := UPPER(TRIM(p_turma));

  -- Se a turma tem formato "TURMA X" ou "Turma X", extrair apenas a letra
  IF v_turma_normalizada LIKE 'TURMA %' THEN
    v_turma_normalizada := TRIM(SUBSTRING(v_turma_normalizada FROM 7));
  END IF;

  -- Buscar etapa onde a data está dentro do período
  SELECT id INTO v_etapa_id
  FROM public.etapas_estudo
  WHERE turma = v_turma_normalizada
    AND ativo = true
    AND p_data >= data_inicio
    AND p_data <= data_fim
  ORDER BY numero DESC
  LIMIT 1;

  RETURN v_etapa_id;
END;
$$;

-- =============================================================================
-- FASE 3: Função e Trigger para criar aulas no diário automaticamente
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
      -- Criar entrada no diário
      INSERT INTO public.aulas_diario (
        turma,
        data_aula,
        conteudo_ministrado,
        observacoes,
        etapa_id,
        origem_aula_virtual_id,
        eh_aula_online,
        presenca_automatica
      ) VALUES (
        v_turma_normalizada,
        NEW.data_aula,
        NEW.titulo,
        'Aula ao vivo criada automaticamente. ' || COALESCE(NEW.descricao, ''),
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

-- Remover trigger antigo se existir
DROP TRIGGER IF EXISTS trg_criar_aulas_diario_automatico ON public.aulas_virtuais;

-- Criar trigger para quando uma aula virtual for criada
CREATE TRIGGER trg_criar_aulas_diario_automatico
AFTER INSERT ON public.aulas_virtuais
FOR EACH ROW
EXECUTE FUNCTION public.criar_aulas_diario_automatico();

-- =============================================================================
-- FASE 4: Função e Trigger para sincronizar presença automaticamente
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
BEGIN
  -- Buscar informações da aula virtual
  SELECT * INTO v_aula_virtual
  FROM public.aulas_virtuais
  WHERE id = NEW.aula_id;

  -- Se não encontrar a aula virtual, ou não for aula ao vivo, ignorar
  IF v_aula_virtual.id IS NULL OR v_aula_virtual.eh_aula_ao_vivo IS NOT TRUE THEN
    RETURN NEW;
  END IF;

  -- Obter e normalizar a turma do aluno
  v_turma_aluno := COALESCE(NEW.turma, 'VISITANTE');
  v_turma_normalizada := UPPER(TRIM(v_turma_aluno));
  IF v_turma_normalizada LIKE 'TURMA %' THEN
    v_turma_normalizada := TRIM(SUBSTRING(v_turma_normalizada FROM 7));
  END IF;

  -- Buscar a aula correspondente no diário
  SELECT id INTO v_aula_diario_id
  FROM public.aulas_diario
  WHERE origem_aula_virtual_id = NEW.aula_id
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

-- Remover trigger antigo se existir
DROP TRIGGER IF EXISTS trg_sincronizar_presenca_diario ON public.presenca_aulas;

-- Criar trigger para quando presença for registrada/atualizada
CREATE TRIGGER trg_sincronizar_presenca_diario
AFTER INSERT OR UPDATE ON public.presenca_aulas
FOR EACH ROW
EXECUTE FUNCTION public.sincronizar_presenca_diario();

-- =============================================================================
-- COMENTÁRIOS E DOCUMENTAÇÃO
-- =============================================================================

COMMENT ON COLUMN public.aulas_diario.origem_aula_virtual_id IS 'Referência à aula virtual que originou esta entrada no diário (se aplicável)';
COMMENT ON COLUMN public.aulas_diario.eh_aula_online IS 'Indica se esta é uma aula online/ao vivo';
COMMENT ON COLUMN public.aulas_diario.presenca_automatica IS 'Indica se a presença é registrada automaticamente pelo sistema';

COMMENT ON FUNCTION public.buscar_etapa_vigente(TEXT, DATE) IS 'Busca a etapa de estudo vigente para uma turma em uma data específica';
COMMENT ON FUNCTION public.criar_aulas_diario_automatico() IS 'Trigger function que cria automaticamente entradas no diário quando uma aula ao vivo é criada';
COMMENT ON FUNCTION public.sincronizar_presenca_diario() IS 'Trigger function que sincroniza presença das aulas ao vivo com o diário online';
