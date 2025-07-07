-- Atualizar função para incluir redacao_manuscrita_url nas redações do corretor
CREATE OR REPLACE FUNCTION public.get_redacoes_corretor_detalhadas(corretor_email text)
 RETURNS TABLE(id uuid, tipo_redacao text, nome_aluno text, email_aluno text, frase_tematica text, data_envio timestamp with time zone, texto text, status_minha_correcao text, eh_corretor_1 boolean, eh_corretor_2 boolean, redacao_manuscrita_url text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
AS $function$
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
    (c2.email = corretor_email) as eh_corretor_2,
    r.redacao_manuscrita_url
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
    (c2.email = corretor_email) as eh_corretor_2,
    r.redacao_manuscrita_url
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
    (c2.email = corretor_email) as eh_corretor_2,
    r.redacao_manuscrita_url
  FROM public.redacoes_exercicio r
  JOIN public.exercicios e ON r.exercicio_id = e.id
  LEFT JOIN public.corretores c1 ON r.corretor_id_1 = c1.id
  LEFT JOIN public.corretores c2 ON r.corretor_id_2 = c2.id
  WHERE (c1.email = corretor_email OR c2.email = corretor_email) 
    AND (c1.ativo = true OR c2.ativo = true)
  
  ORDER BY data_envio DESC;
$function$;