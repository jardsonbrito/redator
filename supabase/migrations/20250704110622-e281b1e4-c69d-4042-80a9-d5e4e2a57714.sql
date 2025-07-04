
-- Adicionar campos específicos para cada corretor nas tabelas de redações
ALTER TABLE public.redacoes_enviadas 
ADD COLUMN c1_corretor_1 integer,
ADD COLUMN c2_corretor_1 integer,
ADD COLUMN c3_corretor_1 integer,
ADD COLUMN c4_corretor_1 integer,
ADD COLUMN c5_corretor_1 integer,
ADD COLUMN nota_final_corretor_1 integer,
ADD COLUMN status_corretor_1 text DEFAULT 'pendente',
ADD COLUMN c1_corretor_2 integer,
ADD COLUMN c2_corretor_2 integer,
ADD COLUMN c3_corretor_2 integer,
ADD COLUMN c4_corretor_2 integer,
ADD COLUMN c5_corretor_2 integer,
ADD COLUMN nota_final_corretor_2 integer,
ADD COLUMN status_corretor_2 text DEFAULT 'pendente';

ALTER TABLE public.redacoes_simulado 
ADD COLUMN c1_corretor_1 integer,
ADD COLUMN c2_corretor_1 integer,
ADD COLUMN c3_corretor_1 integer,
ADD COLUMN c4_corretor_1 integer,
ADD COLUMN c5_corretor_1 integer,
ADD COLUMN nota_final_corretor_1 integer,
ADD COLUMN status_corretor_1 text DEFAULT 'pendente',
ADD COLUMN c1_corretor_2 integer,
ADD COLUMN c2_corretor_2 integer,
ADD COLUMN c3_corretor_2 integer,
ADD COLUMN c4_corretor_2 integer,
ADD COLUMN c5_corretor_2 integer,
ADD COLUMN nota_final_corretor_2 integer,
ADD COLUMN status_corretor_2 text DEFAULT 'pendente';

ALTER TABLE public.redacoes_exercicio 
ADD COLUMN c1_corretor_1 integer,
ADD COLUMN c2_corretor_1 integer,
ADD COLUMN c3_corretor_1 integer,
ADD COLUMN c4_corretor_1 integer,
ADD COLUMN c5_corretor_1 integer,
ADD COLUMN nota_final_corretor_1 integer,
ADD COLUMN status_corretor_1 text DEFAULT 'pendente',
ADD COLUMN c1_corretor_2 integer,
ADD COLUMN c2_corretor_2 integer,
ADD COLUMN c3_corretor_2 integer,
ADD COLUMN c4_corretor_2 integer,
ADD COLUMN c5_corretor_2 integer,
ADD COLUMN nota_final_corretor_2 integer,
ADD COLUMN status_corretor_2 text DEFAULT 'pendente';

-- Adicionar campo para incluir corretores como destinatários de avisos
ALTER TABLE public.avisos 
ADD COLUMN corretores_destinatarios uuid[] DEFAULT '{}';

-- Função atualizada para obter redações do corretor com status específico
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
  eh_corretor_2 boolean
)
LANGUAGE sql
STABLE SECURITY DEFINER
AS $$
  -- Redações enviadas regulares
  SELECT 
    r.id,
    'regular' as tipo_redacao,
    r.nome_aluno,
    r.email_aluno,
    r.frase_tematica,
    r.data_envio,
    r.redacao_texto as texto,
    CASE 
      WHEN c1.email = corretor_email THEN COALESCE(r.status_corretor_1, 'pendente')
      WHEN c2.email = corretor_email THEN COALESCE(r.status_corretor_2, 'pendente')
      ELSE 'pendente'
    END as status_minha_correcao,
    (c1.email = corretor_email) as eh_corretor_1,
    (c2.email = corretor_email) as eh_corretor_2
  FROM public.redacoes_enviadas r
  LEFT JOIN public.corretores c1 ON r.corretor_id_1 = c1.id
  LEFT JOIN public.corretores c2 ON r.corretor_id_2 = c2.id
  WHERE (c1.email = corretor_email OR c2.email = corretor_email) 
    AND (c1.ativo = true OR c2.ativo = true)
  
  UNION ALL
  
  -- Redações de simulado
  SELECT 
    r.id,
    'simulado' as tipo_redacao,
    r.nome_aluno,
    r.email_aluno,
    s.frase_tematica,
    r.data_envio,
    r.texto,
    CASE 
      WHEN c1.email = corretor_email THEN COALESCE(r.status_corretor_1, 'pendente')
      WHEN c2.email = corretor_email THEN COALESCE(r.status_corretor_2, 'pendente')
      ELSE 'pendente'
    END as status_minha_correcao,
    (c1.email = corretor_email) as eh_corretor_1,
    (c2.email = corretor_email) as eh_corretor_2
  FROM public.redacoes_simulado r
  JOIN public.simulados s ON r.id_simulado = s.id
  LEFT JOIN public.corretores c1 ON r.corretor_id_1 = c1.id
  LEFT JOIN public.corretores c2 ON r.corretor_id_2 = c2.id
  WHERE (c1.email = corretor_email OR c2.email = corretor_email) 
    AND (c1.ativo = true OR c2.ativo = true)
  
  UNION ALL
  
  -- Redações de exercício
  SELECT 
    r.id,
    'exercicio' as tipo_redacao,
    r.nome_aluno,
    r.email_aluno,
    e.titulo as frase_tematica,
    r.data_envio,
    r.redacao_texto as texto,
    CASE 
      WHEN c1.email = corretor_email THEN COALESCE(r.status_corretor_1, 'pendente')
      WHEN c2.email = corretor_email THEN COALESCE(r.status_corretor_2, 'pendente')
      ELSE 'pendente'
    END as status_minha_correcao,
    (c1.email = corretor_email) as eh_corretor_1,
    (c2.email = corretor_email) as eh_corretor_2
  FROM public.redacoes_exercicio r
  JOIN public.exercicios e ON r.exercicio_id = e.id
  LEFT JOIN public.corretores c1 ON r.corretor_id_1 = c1.id
  LEFT JOIN public.corretores c2 ON r.corretor_id_2 = c2.id
  WHERE (c1.email = corretor_email OR c2.email = corretor_email) 
    AND (c1.ativo = true OR c2.ativo = true)
  
  ORDER BY data_envio DESC;
$$;

-- Função para obter avisos direcionados a um corretor
CREATE OR REPLACE FUNCTION public.get_avisos_corretor(corretor_id_param uuid)
RETURNS TABLE(
  id uuid,
  titulo text,
  descricao text,
  prioridade text,
  criado_em timestamp with time zone,
  imagem_url text,
  link_externo text
)
LANGUAGE sql
STABLE SECURITY DEFINER
AS $$
  SELECT 
    a.id,
    a.titulo,
    a.descricao,
    a.prioridade,
    a.criado_em,
    a.imagem_url,
    a.link_externo
  FROM public.avisos a
  WHERE a.status = 'publicado' 
    AND a.ativo = true
    AND (
      a.corretores_destinatarios IS NULL 
      OR corretor_id_param = ANY(a.corretores_destinatarios)
    )
    AND (
      a.data_agendamento IS NULL 
      OR a.data_agendamento <= now()
    )
  ORDER BY a.criado_em DESC;
$$;
