-- Corrigir problemas de ranking de simulados

-- 1. Identificar e remover registros duplicados na tabela redacoes_simulado
-- Manter apenas o registro mais recente de cada aluno por simulado

-- Criar uma CTE para identificar registros duplicados
WITH registros_duplicados AS (
  SELECT 
    id,
    nome_aluno,
    id_simulado,
    ROW_NUMBER() OVER (
      PARTITION BY nome_aluno, id_simulado 
      ORDER BY data_envio DESC, id DESC
    ) as rn
  FROM redacoes_simulado
),
-- Identificar IDs a serem removidos (manter apenas o primeiro de cada grupo)
ids_para_remover AS (
  SELECT id 
  FROM registros_duplicados 
  WHERE rn > 1
)
-- Remover registros duplicados
DELETE FROM redacoes_simulado 
WHERE id IN (SELECT id FROM ids_para_remover);

-- 2. Criar função para reprocessar ranking de simulados
CREATE OR REPLACE FUNCTION public.reprocessar_ranking_simulados()
RETURNS TABLE(
  nome_aluno text,
  nota_media numeric,
  status_correcao text,
  simulado_titulo text
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT 
    rs.nome_aluno,
    ROUND((rs.nota_final_corretor_1 + rs.nota_final_corretor_2) / 2.0) as nota_media,
    CASE 
      WHEN rs.status_corretor_1 = 'corrigida' AND rs.status_corretor_2 = 'corrigida'
           AND rs.nota_final_corretor_1 IS NOT NULL AND rs.nota_final_corretor_2 IS NOT NULL
      THEN 'dupla_correcao_finalizada'
      ELSE 'correcao_incompleta'
    END as status_correcao,
    s.titulo as simulado_titulo
  FROM public.redacoes_simulado rs
  JOIN public.simulados s ON rs.id_simulado = s.id
  WHERE rs.status_corretor_1 = 'corrigida' 
    AND rs.status_corretor_2 = 'corrigida'
    AND rs.nota_final_corretor_1 IS NOT NULL 
    AND rs.nota_final_corretor_2 IS NOT NULL
  ORDER BY nota_media DESC, rs.nome_aluno ASC;
$$;

-- 3. Criar função para validar integridade dos dados de simulados
CREATE OR REPLACE FUNCTION public.validar_integridade_simulados()
RETURNS TABLE(
  tipo_problema text,
  nome_aluno text,
  detalhes text
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = ''
AS $$
  -- Verificar registros duplicados
  SELECT 
    'DUPLICADO' as tipo_problema,
    nome_aluno,
    'Total de registros: ' || COUNT(*)::text as detalhes
  FROM public.redacoes_simulado
  GROUP BY nome_aluno, id_simulado
  HAVING COUNT(*) > 1
  
  UNION ALL
  
  -- Verificar registros sem segunda correção
  SELECT 
    'SEGUNDA_CORRECAO_PENDENTE' as tipo_problema,
    nome_aluno,
    'Status corretor 2: ' || COALESCE(status_corretor_2, 'NULL') as detalhes
  FROM public.redacoes_simulado
  WHERE status_corretor_1 = 'corrigida' 
    AND (status_corretor_2 != 'corrigida' OR status_corretor_2 IS NULL)
  
  UNION ALL
  
  -- Verificar registros sem notas finais
  SELECT 
    'NOTAS_INCOMPLETAS' as tipo_problema,
    nome_aluno,
    'Nota 1: ' || COALESCE(nota_final_corretor_1::text, 'NULL') || 
    ', Nota 2: ' || COALESCE(nota_final_corretor_2::text, 'NULL') as detalhes
  FROM public.redacoes_simulado
  WHERE status_corretor_1 = 'corrigida' 
    AND status_corretor_2 = 'corrigida'
    AND (nota_final_corretor_1 IS NULL OR nota_final_corretor_2 IS NULL);
$$;