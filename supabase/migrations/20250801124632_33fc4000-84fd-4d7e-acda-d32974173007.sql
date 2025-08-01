-- Corrigir warnings de segurança - Adicionar SET search_path TO '' em todas as funções

-- 1. Função calcular_tempo_presenca
CREATE OR REPLACE FUNCTION public.calcular_tempo_presenca(p_aula_id uuid, p_email_aluno text)
 RETURNS integer
 LANGUAGE plpgsql
 STABLE
 SET search_path TO ''
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

-- 2. Função calcular_media_corretores
CREATE OR REPLACE FUNCTION public.calcular_media_corretores()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
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

-- 3. Função update_redacao_status_after_correction
CREATE OR REPLACE FUNCTION public.update_redacao_status_after_correction()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
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

-- 4. Função update_aulas_virtuais_updated_at
CREATE OR REPLACE FUNCTION public.update_aulas_virtuais_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
BEGIN
  NEW.atualizado_em = now();
  RETURN NEW;
END;
$function$;

-- 5. Função auto_publish_tema_after_simulado
CREATE OR REPLACE FUNCTION public.auto_publish_tema_after_simulado()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
BEGIN
  -- Verifica se o simulado foi encerrado (data_fim + hora_fim passou)
  IF (NEW.data_fim || ' ' || NEW.hora_fim)::timestamp < NOW() 
     AND OLD.tema_id IS NOT NULL THEN
    
    -- Atualiza o tema para publicado se estava em rascunho
    UPDATE public.temas 
    SET status = 'publicado' 
    WHERE id = OLD.tema_id AND status = 'rascunho';
    
  END IF;
  
  RETURN NEW;
END;
$function$;