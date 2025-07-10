-- Função para detectar possíveis contas duplicadas por nome
CREATE OR REPLACE FUNCTION public.detect_duplicate_students(student_email text)
RETURNS TABLE(
  current_student_id uuid,
  duplicate_student_id uuid,
  current_email text,
  duplicate_email text,
  student_name text,
  redacoes_count bigint
)
LANGUAGE sql
STABLE SECURITY DEFINER
AS $function$
  WITH current_student AS (
    SELECT id, email, nome, sobrenome
    FROM public.profiles 
    WHERE LOWER(TRIM(email)) = LOWER(TRIM(student_email))
    AND user_type = 'aluno'
    LIMIT 1
  ),
  duplicate_candidates AS (
    SELECT p.id, p.email, p.nome, p.sobrenome
    FROM public.profiles p, current_student cs
    WHERE p.user_type = 'aluno'
    AND p.id != cs.id
    AND (
      -- Match por nome completo (considerando variações)
      LOWER(TRIM(p.nome || ' ' || p.sobrenome)) = LOWER(TRIM(cs.nome || ' ' || cs.sobrenome))
      OR
      -- Match por nome sem sobrenome se um dos sobrenomes estiver vazio
      (LOWER(TRIM(p.nome)) = LOWER(TRIM(cs.nome)) AND (p.sobrenome = '' OR cs.sobrenome = ''))
    )
  )
  SELECT 
    cs.id as current_student_id,
    dc.id as duplicate_student_id,
    cs.email as current_email,
    dc.email as duplicate_email,
    cs.nome || ' ' || cs.sobrenome as student_name,
    COALESCE(
      (SELECT COUNT(*) FROM public.redacoes_enviadas WHERE user_id = dc.id),
      0
    ) as redacoes_count
  FROM current_student cs
  CROSS JOIN duplicate_candidates dc
  WHERE EXISTS (
    SELECT 1 FROM public.redacoes_enviadas 
    WHERE user_id = dc.id
  );
$function$;

-- Função para fazer merge seguro de redações entre contas
CREATE OR REPLACE FUNCTION public.merge_student_redacoes(
  target_student_id uuid,
  source_student_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  moved_count integer := 0;
  result jsonb;
BEGIN
  -- Verificar se ambos os IDs existem
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = target_student_id) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'target_student_not_found',
      'message', 'Aluno de destino não encontrado'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = source_student_id) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'source_student_not_found', 
      'message', 'Aluno de origem não encontrado'
    );
  END IF;

  -- Mover redações de redacoes_enviadas
  UPDATE public.redacoes_enviadas 
  SET user_id = target_student_id
  WHERE user_id = source_student_id;
  
  GET DIAGNOSTICS moved_count = ROW_COUNT;

  -- Mover redações de redacoes_simulado
  UPDATE public.redacoes_simulado 
  SET user_id = target_student_id
  WHERE user_id = source_student_id;

  -- Mover redações de redacoes_exercicio  
  UPDATE public.redacoes_exercicio 
  SET user_id = target_student_id
  WHERE user_id = source_student_id;

  -- Desativar a conta antiga (não deletar para manter histórico)
  UPDATE public.profiles 
  SET ativo = false, 
      updated_at = now(),
      -- Adicionar sufixo para evitar conflitos futuros
      email = email || '_merged_' || extract(epoch from now())::text
  WHERE id = source_student_id;

  RETURN jsonb_build_object(
    'success', true,
    'moved_redacoes', moved_count,
    'message', 'Redações movidas com sucesso'
  );
END;
$function$;

-- Função para auto-merge inteligente durante login
CREATE OR REPLACE FUNCTION public.auto_merge_student_accounts(student_email text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  duplicates_record record;
  merge_result jsonb;
  total_merged integer := 0;
BEGIN
  -- Buscar possíveis duplicatas
  FOR duplicates_record IN 
    SELECT * FROM public.detect_duplicate_students(student_email)
    WHERE redacoes_count > 0
  LOOP
    -- Fazer merge automático se encontrar redações na conta antiga
    SELECT public.merge_student_redacoes(
      duplicates_record.current_student_id,
      duplicates_record.duplicate_student_id
    ) INTO merge_result;
    
    IF (merge_result->>'success')::boolean THEN
      total_merged := total_merged + (merge_result->>'moved_redacoes')::integer;
    END IF;
  END LOOP;

  IF total_merged > 0 THEN
    RETURN jsonb_build_object(
      'success', true,
      'auto_merged', true,
      'total_redacoes_merged', total_merged,
      'message', 'Redações anteriores reconectadas automaticamente'
    );
  ELSE
    RETURN jsonb_build_object(
      'success', true,
      'auto_merged', false,
      'message', 'Nenhuma redação anterior encontrada para reconectar'
    );
  END IF;
END;
$function$;