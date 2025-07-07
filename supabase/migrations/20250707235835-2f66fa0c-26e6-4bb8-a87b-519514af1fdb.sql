-- Criar trigger para atualizar status geral quando correção é finalizada
CREATE OR REPLACE FUNCTION public.update_redacao_status_after_correction()
RETURNS TRIGGER AS $$
BEGIN
  -- Para redacoes_enviadas
  IF TG_TABLE_NAME = 'redacoes_enviadas' THEN
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
      END IF;
    END IF;
  END IF;

  -- Para redacoes_simulado
  IF TG_TABLE_NAME = 'redacoes_simulado' THEN
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
      END IF;
    END IF;
  END IF;

  -- Para redacoes_exercicio
  IF TG_TABLE_NAME = 'redacoes_exercicio' THEN
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
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Criar triggers para todas as tabelas de redações
CREATE TRIGGER trigger_update_redacao_status_enviadas
    BEFORE UPDATE ON public.redacoes_enviadas
    FOR EACH ROW
    EXECUTE FUNCTION public.update_redacao_status_after_correction();

CREATE TRIGGER trigger_update_redacao_status_simulado
    BEFORE UPDATE ON public.redacoes_simulado
    FOR EACH ROW
    EXECUTE FUNCTION public.update_redacao_status_after_correction();

CREATE TRIGGER trigger_update_redacao_status_exercicio
    BEFORE UPDATE ON public.redacoes_exercicio
    FOR EACH ROW
    EXECUTE FUNCTION public.update_redacao_status_after_correction();