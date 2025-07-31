-- Corrigir as últimas funções restantes

-- 33. Função update_student_email
CREATE OR REPLACE FUNCTION public.update_student_email(current_email text, new_email text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = ''
AS $function$
DECLARE
  existing_user_id uuid;
  result jsonb;
BEGIN
  -- Verificar se o e-mail atual existe
  SELECT id INTO existing_user_id
  FROM public.profiles
  WHERE email = LOWER(TRIM(current_email))
  AND user_type = 'aluno';

  IF existing_user_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'email_not_found',
      'message', 'E-mail não encontrado no sistema'
    );
  END IF;

  -- Verificar se o novo e-mail já está em uso
  IF EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE email = LOWER(TRIM(new_email))
    AND id != existing_user_id
  ) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'email_in_use',
      'message', 'O novo e-mail já está sendo usado por outro aluno'
    );
  END IF;

  -- Atualizar o e-mail
  UPDATE public.profiles
  SET 
    email = LOWER(TRIM(new_email)),
    updated_at = now()
  WHERE id = existing_user_id;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'E-mail atualizado com sucesso'
  );
END;
$function$;

-- 34. Função update_redacao_status_after_correction
CREATE OR REPLACE FUNCTION public.update_redacao_status_after_correction()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path = ''
AS $function$
BEGIN
  -- Para redacoes_enviadas
  IF TG_TABLE_NAME = 'redacoes_enviadas' THEN
    -- Se um corretor salvou como incompleta, marcar como "em_correcao"
    IF (NEW.status_corretor_1 = 'incompleta' OR NEW.status_corretor_2 = 'incompleta') THEN
      NEW.status := 'em_correcao';
      NEW.corrigida := false;
    END IF;
    
    -- Se um corretor finalizou sua correção
    IF (NEW.status_corretor_1 = 'corrigida' OR NEW.status_corretor_2 = 'corrigida') THEN
      -- Se há apenas um corretor designado ou ambos finalizaram
      IF (NEW.corretor_id_2 IS NULL AND NEW.status_corretor_1 = 'corrigida') OR
         (NEW.status_corretor_1 = 'corrigida' AND NEW.status_corretor_2 = 'corrigida') THEN
        
        -- Marcar como corrigida e calcular notas finais
        NEW.corrigida := true;
        NEW.status := 'corrigido';
        NEW.data_correcao := COALESCE(NEW.data_correcao, now());
        
        -- Calcular notas finais baseado no número de corretores
        IF NEW.corretor_id_2 IS NULL THEN
          -- Apenas um corretor
          NEW.nota_total := NEW.nota_final_corretor_1;
          NEW.nota_c1 := NEW.c1_corretor_1;
          NEW.nota_c2 := NEW.c2_corretor_1;
          NEW.nota_c3 := NEW.c3_corretor_1;
          NEW.nota_c4 := NEW.c4_corretor_1;
          NEW.nota_c5 := NEW.c5_corretor_1;
        ELSE
          -- Dois corretores - calcular média
          NEW.nota_total := ROUND((COALESCE(NEW.nota_final_corretor_1, 0) + COALESCE(NEW.nota_final_corretor_2, 0)) / 2.0);
          NEW.nota_c1 := ROUND((COALESCE(NEW.c1_corretor_1, 0) + COALESCE(NEW.c1_corretor_2, 0)) / 2.0);
          NEW.nota_c2 := ROUND((COALESCE(NEW.c2_corretor_1, 0) + COALESCE(NEW.c2_corretor_2, 0)) / 2.0);
          NEW.nota_c3 := ROUND((COALESCE(NEW.c3_corretor_1, 0) + COALESCE(NEW.c3_corretor_2, 0)) / 2.0);
          NEW.nota_c4 := ROUND((COALESCE(NEW.c4_corretor_1, 0) + COALESCE(NEW.c4_corretor_2, 0)) / 2.0);
          NEW.nota_c5 := ROUND((COALESCE(NEW.c5_corretor_1, 0) + COALESCE(NEW.c5_corretor_2, 0)) / 2.0);
        END IF;
      -- Se apenas um corretor finalizou mas há dois corretores, manter em correção
      ELSE
        NEW.status := 'em_correcao';
        NEW.corrigida := false;
      END IF;
    END IF;
  END IF;

  -- Para redacoes_simulado
  IF TG_TABLE_NAME = 'redacoes_simulado' THEN
    -- Se um corretor salvou como incompleta, não marcar como corrigida
    IF (NEW.status_corretor_1 = 'incompleta' OR NEW.status_corretor_2 = 'incompleta') THEN
      NEW.corrigida := false;
    END IF;
    
    IF (NEW.status_corretor_1 = 'corrigida' OR NEW.status_corretor_2 = 'corrigida') THEN
      IF (NEW.corretor_id_2 IS NULL AND NEW.status_corretor_1 = 'corrigida') OR
         (NEW.status_corretor_1 = 'corrigida' AND NEW.status_corretor_2 = 'corrigida') THEN
        
        NEW.corrigida := true;
        NEW.data_correcao := COALESCE(NEW.data_correcao, now());
        
        IF NEW.corretor_id_2 IS NULL THEN
          NEW.nota_total := NEW.nota_final_corretor_1;
          NEW.nota_c1 := NEW.c1_corretor_1;
          NEW.nota_c2 := NEW.c2_corretor_1;
          NEW.nota_c3 := NEW.c3_corretor_1;
          NEW.nota_c4 := NEW.c4_corretor_1;
          NEW.nota_c5 := NEW.c5_corretor_1;
        ELSE
          NEW.nota_total := ROUND((COALESCE(NEW.nota_final_corretor_1, 0) + COALESCE(NEW.nota_final_corretor_2, 0)) / 2.0);
          NEW.nota_c1 := ROUND((COALESCE(NEW.c1_corretor_1, 0) + COALESCE(NEW.c1_corretor_2, 0)) / 2.0);
          NEW.nota_c2 := ROUND((COALESCE(NEW.c2_corretor_1, 0) + COALESCE(NEW.c2_corretor_2, 0)) / 2.0);
          NEW.nota_c3 := ROUND((COALESCE(NEW.c3_corretor_1, 0) + COALESCE(NEW.c3_corretor_2, 0)) / 2.0);
          NEW.nota_c4 := ROUND((COALESCE(NEW.c4_corretor_1, 0) + COALESCE(NEW.c4_corretor_2, 0)) / 2.0);
          NEW.nota_c5 := ROUND((COALESCE(NEW.c5_corretor_1, 0) + COALESCE(NEW.c5_corretor_2, 0)) / 2.0);
        END IF;
      ELSE
        NEW.corrigida := false;
      END IF;
    END IF;
  END IF;

  -- Para redacoes_exercicio
  IF TG_TABLE_NAME = 'redacoes_exercicio' THEN
    -- Se um corretor salvou como incompleta, não marcar como corrigida
    IF (NEW.status_corretor_1 = 'incompleta' OR NEW.status_corretor_2 = 'incompleta') THEN
      NEW.corrigida := false;
    END IF;
    
    IF (NEW.status_corretor_1 = 'corrigida' OR NEW.status_corretor_2 = 'corrigida') THEN
      IF (NEW.corretor_id_2 IS NULL AND NEW.status_corretor_1 = 'corrigida') OR
         (NEW.status_corretor_1 = 'corrigida' AND NEW.status_corretor_2 = 'corrigida') THEN
        
        NEW.corrigida := true;
        NEW.data_correcao := COALESCE(NEW.data_correcao, now());
        
        IF NEW.corretor_id_2 IS NULL THEN
          NEW.nota_total := NEW.nota_final_corretor_1;
          NEW.nota_c1 := NEW.c1_corretor_1;
          NEW.nota_c2 := NEW.c2_corretor_1;
          NEW.nota_c3 := NEW.c3_corretor_1;
          NEW.nota_c4 := NEW.c4_corretor_1;
          NEW.nota_c5 := NEW.c5_corretor_1;
        ELSE
          NEW.nota_total := ROUND((COALESCE(NEW.nota_final_corretor_1, 0) + COALESCE(NEW.nota_final_corretor_2, 0)) / 2.0);
          NEW.nota_c1 := ROUND((COALESCE(NEW.c1_corretor_1, 0) + COALESCE(NEW.c1_corretor_2, 0)) / 2.0);
          NEW.nota_c2 := ROUND((COALESCE(NEW.c2_corretor_1, 0) + COALESCE(NEW.c2_corretor_2, 0)) / 2.0);
          NEW.nota_c3 := ROUND((COALESCE(NEW.c3_corretor_1, 0) + COALESCE(NEW.c3_corretor_2, 0)) / 2.0);
          NEW.nota_c4 := ROUND((COALESCE(NEW.c4_corretor_1, 0) + COALESCE(NEW.c4_corretor_2, 0)) / 2.0);
          NEW.nota_c5 := ROUND((COALESCE(NEW.c5_corretor_1, 0) + COALESCE(NEW.c5_corretor_2, 0)) / 2.0);
        END IF;
      ELSE
        NEW.corrigida := false;
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;

-- 35. Função trocar_senha_professor
CREATE OR REPLACE FUNCTION public.trocar_senha_professor(professor_id uuid, nova_senha text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = ''
AS $function$
BEGIN
  -- Atualizar senha e marcar que não é mais primeiro login
  UPDATE public.professores 
  SET 
    senha_hash = nova_senha,
    primeiro_login = false,
    atualizado_em = now()
  WHERE id = professor_id;
  
  IF FOUND THEN
    RETURN jsonb_build_object(
      'success', true,
      'message', 'Senha alterada com sucesso'
    );
  ELSE
    RETURN jsonb_build_object(
      'success', false,
      'error', 'professor_not_found',
      'message', 'Professor não encontrado'
    );
  END IF;
END;
$function$;