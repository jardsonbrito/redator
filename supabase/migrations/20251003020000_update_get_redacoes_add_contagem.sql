-- Migration: Atualizar função get_redacoes_corretor_detalhadas para incluir contagem_palavras
-- Data: 2025-10-03

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
  contagem_palavras integer,
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

  -- Redações enviadas regulares
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
    r.contagem_palavras,
    r.corretor_id_1,
    r.corretor_id_2,
    r.turma
  FROM public.redacoes_enviadas r
  CROSS JOIN corretor_info ci
  WHERE (r.corretor_id_1 = ci.id OR r.corretor_id_2 = ci.id)

  UNION ALL

  -- Redações de simulado
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
    rs.contagem_palavras,
    rs.corretor_id_1,
    rs.corretor_id_2,
    rs.turma
  FROM public.redacoes_simulado rs
  JOIN public.simulados s ON rs.id_simulado = s.id
  CROSS JOIN corretor_info ci
  WHERE (rs.corretor_id_1 = ci.id OR rs.corretor_id_2 = ci.id)

  UNION ALL

  -- Redações de exercício
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
    re.contagem_palavras,
    re.corretor_id_1,
    re.corretor_id_2,
    re.turma
  FROM public.redacoes_exercicio re
  JOIN public.exercicios e ON re.exercicio_id = e.id
  CROSS JOIN corretor_info ci
  WHERE (re.corretor_id_1 = ci.id OR re.corretor_id_2 = ci.id)

  ORDER BY data_envio DESC;
$function$;
