-- ========================================================================
-- SCRIPT DE APLICAÇÃO MANUAL DAS MIGRATIONS
-- Sistema de Correção Uniforme de Imagens (manuscritas + digitadas→A4)
-- ========================================================================
-- Data: 03/10/2025
-- Descrição: Aplica as migrations necessárias para uniformizar o tratamento
--            de redações em imagem no sistema de correção
-- ========================================================================

-- PASSO 1: Adicionar campos nas tabelas de redações
-- Migration: 20251002120000_add_redacao_imagem_fields.sql
-- ========================================================================

-- Tabela: redacoes_enviadas
ALTER TABLE public.redacoes_enviadas
ADD COLUMN IF NOT EXISTS tipo_redacao_original VARCHAR(20) DEFAULT 'digitada'
  CHECK (tipo_redacao_original IN ('digitada', 'manuscrita')),
ADD COLUMN IF NOT EXISTS redacao_imagem_gerada_url TEXT;

-- Tabela: redacoes_simulado
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'redacoes_simulado') THEN
    ALTER TABLE public.redacoes_simulado
    ADD COLUMN IF NOT EXISTS tipo_redacao_original VARCHAR(20) DEFAULT 'digitada'
      CHECK (tipo_redacao_original IN ('digitada', 'manuscrita')),
    ADD COLUMN IF NOT EXISTS redacao_imagem_gerada_url TEXT;
  END IF;
END $$;

-- Tabela: redacoes_exercicio
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'redacoes_exercicio') THEN
    ALTER TABLE public.redacoes_exercicio
    ADD COLUMN IF NOT EXISTS tipo_redacao_original VARCHAR(20) DEFAULT 'digitada'
      CHECK (tipo_redacao_original IN ('digitada', 'manuscrita')),
    ADD COLUMN IF NOT EXISTS redacao_imagem_gerada_url TEXT;
  END IF;
END $$;

-- Comentários para documentação
COMMENT ON COLUMN public.redacoes_enviadas.tipo_redacao_original IS
  'Tipo original da redação: digitada (convertida para imagem) ou manuscrita (upload direto)';

COMMENT ON COLUMN public.redacoes_enviadas.redacao_imagem_gerada_url IS
  'URL da imagem A4 gerada automaticamente a partir do texto digitado';

-- Criar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_redacoes_enviadas_tipo_original
  ON public.redacoes_enviadas(tipo_redacao_original);

DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'redacoes_simulado') THEN
    CREATE INDEX IF NOT EXISTS idx_redacoes_simulado_tipo_original
      ON public.redacoes_simulado(tipo_redacao_original);
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'redacoes_exercicio') THEN
    CREATE INDEX IF NOT EXISTS idx_redacoes_exercicio_tipo_original
      ON public.redacoes_exercicio(tipo_redacao_original);
  END IF;
END $$;

-- Migrar dados existentes: definir tipo_redacao_original baseado em redacao_manuscrita_url
UPDATE public.redacoes_enviadas
SET tipo_redacao_original = CASE
  WHEN redacao_manuscrita_url IS NOT NULL AND redacao_manuscrita_url != '' THEN 'manuscrita'
  ELSE 'digitada'
END
WHERE tipo_redacao_original IS NULL;

DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'redacoes_simulado') THEN
    UPDATE public.redacoes_simulado
    SET tipo_redacao_original = CASE
      WHEN redacao_manuscrita_url IS NOT NULL AND redacao_manuscrita_url != '' THEN 'manuscrita'
      ELSE 'digitada'
    END
    WHERE tipo_redacao_original IS NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'redacoes_exercicio') THEN
    UPDATE public.redacoes_exercicio
    SET tipo_redacao_original = CASE
      WHEN redacao_manuscrita_url IS NOT NULL AND redacao_manuscrita_url != '' THEN 'manuscrita'
      ELSE 'digitada'
    END
    WHERE tipo_redacao_original IS NULL;
  END IF;
END $$;

-- ========================================================================
-- PASSO 2: Atualizar função RPC get_redacoes_corretor_detalhadas
-- Migration: 20251003000000_update_get_redacoes_corretor_detalhadas.sql
-- ========================================================================

DROP FUNCTION IF EXISTS public.get_redacoes_corretor_detalhadas(text);

CREATE OR REPLACE FUNCTION public.get_redacoes_corretor_detalhadas(corretor_email text)
RETURNS TABLE(
  id uuid,
  tipo_redacao text,
  nome_aluno text,
  email_aluno text,
  frase_tematica text,
  data_envio timestamp with time zone,
  texto text,
  status_minha_correcao text,
  eh_corretor_1 boolean,
  eh_corretor_2 boolean,
  redacao_manuscrita_url text,
  redacao_imagem_gerada_url text,
  corretor_id_1 uuid,
  corretor_id_2 uuid,
  turma text
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO ''
AS $function$
  -- Buscar ID do corretor
  WITH corretor_info AS (
    SELECT c.id, c.email, c.ativo
    FROM public.corretores c
    WHERE c.email = corretor_email AND c.ativo = true
    LIMIT 1
  )

  -- Redações enviadas regulares - TODAS as redações do corretor
  SELECT
    r.id,
    'regular'::text as tipo_redacao,
    r.nome_aluno,
    r.email_aluno,
    r.frase_tematica,
    r.data_envio,
    r.redacao_texto as texto,
    CASE
      WHEN r.corretor_id_1 = ci.id THEN
        COALESCE(r.status_corretor_1, 'pendente')
      WHEN r.corretor_id_2 = ci.id THEN
        COALESCE(r.status_corretor_2, 'pendente')
      ELSE 'pendente'
    END::text as status_minha_correcao,
    (r.corretor_id_1 = ci.id) as eh_corretor_1,
    (r.corretor_id_2 = ci.id) as eh_corretor_2,
    r.redacao_manuscrita_url,
    r.redacao_imagem_gerada_url,
    r.corretor_id_1,
    r.corretor_id_2,
    r.turma
  FROM public.redacoes_enviadas r
  CROSS JOIN corretor_info ci
  WHERE (r.corretor_id_1 = ci.id OR r.corretor_id_2 = ci.id)

  UNION ALL

  -- Redações de simulado - TODAS as redações do corretor
  SELECT
    rs.id,
    'simulado'::text as tipo_redacao,
    rs.nome_aluno,
    rs.email_aluno,
    s.frase_tematica,
    rs.data_envio,
    rs.texto,
    CASE
      WHEN rs.corretor_id_1 = ci.id THEN
        COALESCE(rs.status_corretor_1, 'pendente')
      WHEN rs.corretor_id_2 = ci.id THEN
        COALESCE(rs.status_corretor_2, 'pendente')
      ELSE 'pendente'
    END::text as status_minha_correcao,
    (rs.corretor_id_1 = ci.id) as eh_corretor_1,
    (rs.corretor_id_2 = ci.id) as eh_corretor_2,
    rs.redacao_manuscrita_url,
    rs.redacao_imagem_gerada_url,
    rs.corretor_id_1,
    rs.corretor_id_2,
    rs.turma
  FROM public.redacoes_simulado rs
  JOIN public.simulados s ON rs.id_simulado = s.id
  CROSS JOIN corretor_info ci
  WHERE (rs.corretor_id_1 = ci.id OR rs.corretor_id_2 = ci.id)

  UNION ALL

  -- Redações de exercício - TODAS as redações do corretor
  SELECT
    re.id,
    'exercicio'::text as tipo_redacao,
    re.nome_aluno,
    re.email_aluno,
    e.titulo as frase_tematica,
    re.data_envio,
    re.redacao_texto as texto,
    CASE
      WHEN re.corretor_id_1 = ci.id THEN
        COALESCE(re.status_corretor_1, 'pendente')
      WHEN re.corretor_id_2 = ci.id THEN
        COALESCE(re.status_corretor_2, 'pendente')
      ELSE 'pendente'
    END::text as status_minha_correcao,
    (re.corretor_id_1 = ci.id) as eh_corretor_1,
    (re.corretor_id_2 = ci.id) as eh_corretor_2,
    re.redacao_manuscrita_url,
    re.redacao_imagem_gerada_url,
    re.corretor_id_1,
    re.corretor_id_2,
    re.turma
  FROM public.redacoes_exercicio re
  JOIN public.exercicios e ON re.exercicio_id = e.id
  CROSS JOIN corretor_info ci
  WHERE (re.corretor_id_1 = ci.id OR re.corretor_id_2 = ci.id)

  ORDER BY data_envio DESC;
$function$;

-- Comentário para documentação
COMMENT ON FUNCTION public.get_redacoes_corretor_detalhadas(text) IS
  'Retorna todas as redações atribuídas a um corretor, incluindo URLs de imagens manuscritas e geradas (digitadas→A4)';

-- ========================================================================
-- FIM DO SCRIPT
-- ========================================================================

-- Verificar se as migrations foram aplicadas com sucesso:
SELECT
  'redacoes_enviadas' as tabela,
  COUNT(*) as total_registros,
  SUM(CASE WHEN redacao_imagem_gerada_url IS NOT NULL THEN 1 ELSE 0 END) as com_imagem_gerada,
  SUM(CASE WHEN redacao_manuscrita_url IS NOT NULL THEN 1 ELSE 0 END) as com_manuscrita,
  SUM(CASE WHEN tipo_redacao_original = 'digitada' THEN 1 ELSE 0 END) as tipo_digitada,
  SUM(CASE WHEN tipo_redacao_original = 'manuscrita' THEN 1 ELSE 0 END) as tipo_manuscrita
FROM public.redacoes_enviadas

UNION ALL

SELECT
  'redacoes_simulado' as tabela,
  COUNT(*) as total_registros,
  SUM(CASE WHEN redacao_imagem_gerada_url IS NOT NULL THEN 1 ELSE 0 END) as com_imagem_gerada,
  SUM(CASE WHEN redacao_manuscrita_url IS NOT NULL THEN 1 ELSE 0 END) as com_manuscrita,
  SUM(CASE WHEN tipo_redacao_original = 'digitada' THEN 1 ELSE 0 END) as tipo_digitada,
  SUM(CASE WHEN tipo_redacao_original = 'manuscrita' THEN 1 ELSE 0 END) as tipo_manuscrita
FROM public.redacoes_simulado

UNION ALL

SELECT
  'redacoes_exercicio' as tabela,
  COUNT(*) as total_registros,
  SUM(CASE WHEN redacao_imagem_gerada_url IS NOT NULL THEN 1 ELSE 0 END) as com_imagem_gerada,
  SUM(CASE WHEN redacao_manuscrita_url IS NOT NULL THEN 1 ELSE 0 END) as com_manuscrita,
  SUM(CASE WHEN tipo_redacao_original = 'digitada' THEN 1 ELSE 0 END) as tipo_digitada,
  SUM(CASE WHEN tipo_redacao_original = 'manuscrita' THEN 1 ELSE 0 END) as tipo_manuscrita
FROM public.redacoes_exercicio;
