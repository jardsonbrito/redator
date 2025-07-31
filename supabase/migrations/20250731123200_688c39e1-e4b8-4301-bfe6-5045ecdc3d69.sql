-- Finalizar corrigindo as últimas funções adicionando SET search_path = ''

-- 26. Função is_main_admin
CREATE OR REPLACE FUNCTION public.is_main_admin()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path = ''
AS $function$
  SELECT COALESCE(
    auth.email() = 'jardsonbrito@gmail.com' OR 
    auth.email() = 'jarvisluz@gmail.com', 
    false
  );
$function$;

-- 27. Função handle_new_authenticated_user
CREATE OR REPLACE FUNCTION public.handle_new_authenticated_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = ''
AS $function$
BEGIN
  -- Inserir perfil para usuário autenticado
  INSERT INTO public.profiles (
    id, 
    nome, 
    sobrenome, 
    email, 
    turma,
    turma_codigo,
    user_type,
    is_authenticated_student,
    created_at,
    updated_at
  )
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nome', 'Aluno'),
    COALESCE(NEW.raw_user_meta_data->>'sobrenome', 'Novo'),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'turma', ''),
    COALESCE(NEW.raw_user_meta_data->>'turma_codigo', ''),
    'aluno_autenticado',
    true,
    now(),
    now()
  );
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'Erro ao criar perfil autenticado: %', SQLERRM;
    RETURN NEW;
END;
$function$;

-- 28. Função get_turma_codigo
CREATE OR REPLACE FUNCTION public.get_turma_codigo(turma_nome text)
 RETURNS text
 LANGUAGE sql
 STABLE
 SET search_path = ''
AS $function$
  SELECT CASE turma_nome
    WHEN 'Turma A' THEN 'LRA2025'
    WHEN 'Turma B' THEN 'LRB2025'
    WHEN 'Turma C' THEN 'LRC2025'
    WHEN 'Turma D' THEN 'LRD2025'
    WHEN 'Turma E' THEN 'LRE2025'
    ELSE turma_nome
  END;
$function$;

-- 29. Função validate_professor_login
CREATE OR REPLACE FUNCTION public.validate_professor_login(p_email text, p_senha text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = ''
AS $function$
DECLARE
  professor_record RECORD;
  login_result JSONB;
BEGIN
  -- Buscar professor por email
  SELECT * INTO professor_record
  FROM public.professores 
  WHERE email = LOWER(TRIM(p_email)) 
  AND ativo = true;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'invalid_credentials',
      'message', 'Email ou senha inválidos'
    );
  END IF;
  
  -- Verificar senha (por enquanto comparação simples, depois implementar hash)
  IF professor_record.senha_hash != p_senha THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'invalid_credentials', 
      'message', 'Email ou senha inválidos'
    );
  END IF;
  
  -- Atualizar último login
  UPDATE public.professores 
  SET ultimo_login = now()
  WHERE id = professor_record.id;
  
  -- Inserir log de acesso
  INSERT INTO public.professor_access_logs (professor_id, acao)
  VALUES (professor_record.id, 'login');
  
  RETURN jsonb_build_object(
    'success', true,
    'professor', jsonb_build_object(
      'id', professor_record.id,
      'nome_completo', professor_record.nome_completo,
      'email', professor_record.email,
      'role', professor_record.role,
      'primeiro_login', professor_record.primeiro_login
    )
  );
END;
$function$;

-- 30. Função is_authenticated_student
CREATE OR REPLACE FUNCTION public.is_authenticated_student()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path = ''
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND is_authenticated_student = true
  );
$function$;

-- 31. Função calcular_tempo_presenca
CREATE OR REPLACE FUNCTION public.calcular_tempo_presenca(p_aula_id uuid, p_email_aluno text)
 RETURNS integer
 LANGUAGE plpgsql
 STABLE
 SET search_path = ''
AS $function$
DECLARE
  entrada_timestamp TIMESTAMP WITH TIME ZONE;
  saida_timestamp TIMESTAMP WITH TIME ZONE;
  tempo_minutos INTEGER;
BEGIN
  -- Buscar horário de entrada
  SELECT data_registro INTO entrada_timestamp
  FROM public.presenca_aulas
  WHERE aula_id = p_aula_id 
    AND email_aluno = p_email_aluno 
    AND tipo_registro = 'entrada';
  
  -- Buscar horário de saída
  SELECT data_registro INTO saida_timestamp
  FROM public.presenca_aulas
  WHERE aula_id = p_aula_id 
    AND email_aluno = p_email_aluno 
    AND tipo_registro = 'saida';
  
  -- Calcular diferença em minutos se ambos existem
  IF entrada_timestamp IS NOT NULL AND saida_timestamp IS NOT NULL THEN
    tempo_minutos := EXTRACT(EPOCH FROM (saida_timestamp - entrada_timestamp)) / 60;
    RETURN tempo_minutos;
  ELSE
    RETURN NULL;
  END IF;
END;
$function$;

-- 32. Função calcular_media_corretores
CREATE OR REPLACE FUNCTION public.calcular_media_corretores()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path = ''
AS $function$
BEGIN
  -- Calcular média apenas quando ambos os corretores terminaram
  IF NEW.nota_final_corretor_1 IS NOT NULL AND NEW.nota_final_corretor_2 IS NOT NULL THEN
    NEW.nota_total := ROUND((NEW.nota_final_corretor_1 + NEW.nota_final_corretor_2) / 2.0);
    
    -- Calcular médias por competência também
    NEW.nota_c1 := ROUND((COALESCE(NEW.c1_corretor_1, 0) + COALESCE(NEW.c1_corretor_2, 0)) / 2.0);
    NEW.nota_c2 := ROUND((COALESCE(NEW.c2_corretor_1, 0) + COALESCE(NEW.c2_corretor_2, 0)) / 2.0);
    NEW.nota_c3 := ROUND((COALESCE(NEW.c3_corretor_1, 0) + COALESCE(NEW.c3_corretor_2, 0)) / 2.0);
    NEW.nota_c4 := ROUND((COALESCE(NEW.c4_corretor_1, 0) + COALESCE(NEW.c4_corretor_2, 0)) / 2.0);
    NEW.nota_c5 := ROUND((COALESCE(NEW.c5_corretor_1, 0) + COALESCE(NEW.c5_corretor_2, 0)) / 2.0);
    
    NEW.corrigida := true;
  ELSIF NEW.nota_final_corretor_1 IS NOT NULL AND NEW.corretor_id_2 IS NULL THEN
    -- Se apenas um corretor, usar a nota dele
    NEW.nota_total := NEW.nota_final_corretor_1;
    NEW.nota_c1 := NEW.c1_corretor_1;
    NEW.nota_c2 := NEW.c2_corretor_1;
    NEW.nota_c3 := NEW.c3_corretor_1;
    NEW.nota_c4 := NEW.c4_corretor_1;
    NEW.nota_c5 := NEW.c5_corretor_1;
    NEW.corrigida := true;
  END IF;
  
  RETURN NEW;
END;
$function$;