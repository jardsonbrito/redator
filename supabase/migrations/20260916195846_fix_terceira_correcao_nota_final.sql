-- Corrige o cálculo de nota_total/nota_c1..c5 em redacoes_simulado quando há
-- terceira correção (Coordenação) concluída.
--
-- Contexto: quando uma redação de simulado tem discrepância entre Corretor 1 e
-- Corretor 2, a Coordenação faz uma terceira correção e o resultado é gravado em
-- c1_admin..c5_admin, nota_final_admin, par_utilizado ('1_admin' ou '2_admin') e
-- status_terceira_correcao = 'concluida'. A nota final deveria ser a média entre
-- a Coordenação e o corretor mais próximo dela (indicado em par_utilizado).
--
-- Bug: a função calcular_media_corretores() (trigger BEFORE UPDATE) sempre
-- recalculava nota_total/nota_c1..c5 como média simples de Corretor 1 + Corretor 2,
-- inclusive depois de concluída a terceira correção, sobrescrevendo o resultado
-- correto a cada UPDATE subsequente na linha.

CREATE OR REPLACE FUNCTION public.calcular_media_corretores()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
BEGIN
  IF TG_TABLE_NAME = 'redacoes_simulado' THEN
    -- Terceira correção (Coordenação) concluída: a nota final é a média entre a
    -- Coordenação e o corretor mais próximo dela, definido em par_utilizado.
    IF NEW.status_terceira_correcao = 'concluida' AND NEW.par_utilizado IN ('1_admin', '2_admin') THEN
      IF NEW.par_utilizado = '1_admin' THEN
        NEW.nota_total := ROUND((COALESCE(NEW.nota_final_corretor_1, 0) + COALESCE(NEW.nota_final_admin, 0)) / 2.0);
        NEW.nota_c1 := ROUND((COALESCE(NEW.c1_corretor_1, 0) + COALESCE(NEW.c1_admin, 0)) / 2.0);
        NEW.nota_c2 := ROUND((COALESCE(NEW.c2_corretor_1, 0) + COALESCE(NEW.c2_admin, 0)) / 2.0);
        NEW.nota_c3 := ROUND((COALESCE(NEW.c3_corretor_1, 0) + COALESCE(NEW.c3_admin, 0)) / 2.0);
        NEW.nota_c4 := ROUND((COALESCE(NEW.c4_corretor_1, 0) + COALESCE(NEW.c4_admin, 0)) / 2.0);
        NEW.nota_c5 := ROUND((COALESCE(NEW.c5_corretor_1, 0) + COALESCE(NEW.c5_admin, 0)) / 2.0);
      ELSE
        NEW.nota_total := ROUND((COALESCE(NEW.nota_final_corretor_2, 0) + COALESCE(NEW.nota_final_admin, 0)) / 2.0);
        NEW.nota_c1 := ROUND((COALESCE(NEW.c1_corretor_2, 0) + COALESCE(NEW.c1_admin, 0)) / 2.0);
        NEW.nota_c2 := ROUND((COALESCE(NEW.c2_corretor_2, 0) + COALESCE(NEW.c2_admin, 0)) / 2.0);
        NEW.nota_c3 := ROUND((COALESCE(NEW.c3_corretor_2, 0) + COALESCE(NEW.c3_admin, 0)) / 2.0);
        NEW.nota_c4 := ROUND((COALESCE(NEW.c4_corretor_2, 0) + COALESCE(NEW.c4_admin, 0)) / 2.0);
        NEW.nota_c5 := ROUND((COALESCE(NEW.c5_corretor_2, 0) + COALESCE(NEW.c5_admin, 0)) / 2.0);
      END IF;
      NEW.corrigida := true;
      RETURN NEW;
    END IF;
  END IF;

  -- Dois corretores: calcular médias mas NÃO auto-finalizar (corrigida=true).
  -- Para simulados com dupla correção, a verificação de discrepância é feita
  -- pelo app; o admin finaliza manualmente quando necessário.
  IF NEW.nota_final_corretor_1 IS NOT NULL AND NEW.nota_final_corretor_2 IS NOT NULL THEN
    NEW.nota_total := ROUND((NEW.nota_final_corretor_1 + NEW.nota_final_corretor_2) / 2.0);
    NEW.nota_c1 := ROUND((COALESCE(NEW.c1_corretor_1, 0) + COALESCE(NEW.c1_corretor_2, 0)) / 2.0);
    NEW.nota_c2 := ROUND((COALESCE(NEW.c2_corretor_1, 0) + COALESCE(NEW.c2_corretor_2, 0)) / 2.0);
    NEW.nota_c3 := ROUND((COALESCE(NEW.c3_corretor_1, 0) + COALESCE(NEW.c3_corretor_2, 0)) / 2.0);
    NEW.nota_c4 := ROUND((COALESCE(NEW.c4_corretor_1, 0) + COALESCE(NEW.c4_corretor_2, 0)) / 2.0);
    NEW.nota_c5 := ROUND((COALESCE(NEW.c5_corretor_1, 0) + COALESCE(NEW.c5_corretor_2, 0)) / 2.0);
  ELSIF NEW.nota_final_corretor_1 IS NOT NULL AND NEW.corretor_id_2 IS NULL THEN
    -- Corretor único: finaliza automaticamente
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

-- Backfill: recalcula nota_total/nota_c1..c5 das redações de simulado que já
-- passaram por terceira correção antes desta correção existir.
UPDATE public.redacoes_simulado
SET data_terceira_correcao = data_terceira_correcao
WHERE status_terceira_correcao = 'concluida'
  AND par_utilizado IN ('1_admin', '2_admin');
