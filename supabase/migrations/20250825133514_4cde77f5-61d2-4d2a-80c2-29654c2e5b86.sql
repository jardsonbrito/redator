-- Criar função para verificar acesso às aulas gravadas que funciona tanto para usuários autenticados quanto anônimos
CREATE OR REPLACE FUNCTION public.get_accessible_aulas(
  p_user_type text DEFAULT NULL,
  p_user_turma text DEFAULT NULL
)
RETURNS TABLE(
  id uuid,
  titulo text,
  descricao text,
  link_conteudo text,
  pdf_url text,
  pdf_nome text,
  turmas_autorizadas text[],
  permite_visitante boolean,
  ativo boolean,
  criado_em timestamp with time zone,
  cover_source text,
  cover_file_path text,
  cover_url text,
  video_url_original text,
  platform text,
  video_id text,
  embed_url text,
  video_thumbnail_url text,
  modulo_id uuid,
  modulo_nome text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    a.id,
    a.titulo,
    a.descricao,
    a.link_conteudo,
    a.pdf_url,
    a.pdf_nome,
    a.turmas_autorizadas,
    a.permite_visitante,
    a.ativo,
    a.criado_em,
    a.cover_source,
    a.cover_file_path,
    a.cover_url,
    a.video_url_original,
    a.platform,
    a.video_id,
    a.embed_url,
    a.video_thumbnail_url,
    a.modulo_id,
    m.nome as modulo_nome
  FROM public.aulas a
  INNER JOIN public.modulos m ON a.modulo_id = m.id
  WHERE a.ativo = true
  AND (
    -- Se for visitante, só mostrar aulas que permitem visitante
    (p_user_type = 'visitante' AND a.permite_visitante = true)
    OR
    -- Se for aluno, verificar se está na turma autorizada ou se não há restrições
    (p_user_type = 'aluno' AND p_user_turma IS NOT NULL AND (
      a.turmas_autorizadas IS NULL 
      OR array_length(a.turmas_autorizadas, 1) IS NULL
      OR array_length(a.turmas_autorizadas, 1) = 0
      OR EXISTS (
        SELECT 1 FROM unnest(a.turmas_autorizadas) AS turma_autorizada
        WHERE UPPER(TRIM(turma_autorizada)) = UPPER(TRIM(p_user_turma))
      )
    ))
    OR
    -- Se não especificou tipo de usuário, mostrar todas as aulas ativas (para admin)
    p_user_type IS NULL
  )
  ORDER BY a.criado_em DESC;
END;
$$;