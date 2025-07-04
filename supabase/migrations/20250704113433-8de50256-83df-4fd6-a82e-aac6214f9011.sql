
-- Adicionar colunas para correções individuais dos corretores na tabela redacoes_enviadas
ALTER TABLE public.redacoes_enviadas 
ADD COLUMN IF NOT EXISTS c1_corretor_1 INTEGER,
ADD COLUMN IF NOT EXISTS c2_corretor_1 INTEGER,
ADD COLUMN IF NOT EXISTS c3_corretor_1 INTEGER,
ADD COLUMN IF NOT EXISTS c4_corretor_1 INTEGER,
ADD COLUMN IF NOT EXISTS c5_corretor_1 INTEGER,
ADD COLUMN IF NOT EXISTS nota_final_corretor_1 INTEGER,
ADD COLUMN IF NOT EXISTS status_corretor_1 TEXT DEFAULT 'pendente',
ADD COLUMN IF NOT EXISTS c1_corretor_2 INTEGER,
ADD COLUMN IF NOT EXISTS c2_corretor_2 INTEGER,
ADD COLUMN IF NOT EXISTS c3_corretor_2 INTEGER,
ADD COLUMN IF NOT EXISTS c4_corretor_2 INTEGER,
ADD COLUMN IF NOT EXISTS c5_corretor_2 INTEGER,
ADD COLUMN IF NOT EXISTS nota_final_corretor_2 INTEGER,
ADD COLUMN IF NOT EXISTS status_corretor_2 TEXT DEFAULT 'pendente',
ADD COLUMN IF NOT EXISTS corretor_id_1 UUID REFERENCES public.corretores(id),
ADD COLUMN IF NOT EXISTS corretor_id_2 UUID REFERENCES public.corretores(id);

-- Adicionar as mesmas colunas para redacoes_simulado
ALTER TABLE public.redacoes_simulado 
ADD COLUMN IF NOT EXISTS c1_corretor_1 INTEGER,
ADD COLUMN IF NOT EXISTS c2_corretor_1 INTEGER,
ADD COLUMN IF NOT EXISTS c3_corretor_1 INTEGER,
ADD COLUMN IF NOT EXISTS c4_corretor_1 INTEGER,
ADD COLUMN IF NOT EXISTS c5_corretor_1 INTEGER,
ADD COLUMN IF NOT EXISTS nota_final_corretor_1 INTEGER,
ADD COLUMN IF NOT EXISTS status_corretor_1 TEXT DEFAULT 'pendente',
ADD COLUMN IF NOT EXISTS c1_corretor_2 INTEGER,
ADD COLUMN IF NOT EXISTS c2_corretor_2 INTEGER,
ADD COLUMN IF NOT EXISTS c3_corretor_2 INTEGER,
ADD COLUMN IF NOT EXISTS c4_corretor_2 INTEGER,
ADD COLUMN IF NOT EXISTS c5_corretor_2 INTEGER,
ADD COLUMN IF NOT EXISTS nota_final_corretor_2 INTEGER,
ADD COLUMN IF NOT EXISTS status_corretor_2 TEXT DEFAULT 'pendente',
ADD COLUMN IF NOT EXISTS corretor_id_1 UUID REFERENCES public.corretores(id),
ADD COLUMN IF NOT EXISTS corretor_id_2 UUID REFERENCES public.corretores(id);

-- Adicionar as mesmas colunas para redacoes_exercicio
ALTER TABLE public.redacoes_exercicio 
ADD COLUMN IF NOT EXISTS c1_corretor_1 INTEGER,
ADD COLUMN IF NOT EXISTS c2_corretor_1 INTEGER,
ADD COLUMN IF NOT EXISTS c3_corretor_1 INTEGER,
ADD COLUMN IF NOT EXISTS c4_corretor_1 INTEGER,
ADD COLUMN IF NOT EXISTS c5_corretor_1 INTEGER,
ADD COLUMN IF NOT EXISTS nota_final_corretor_1 INTEGER,
ADD COLUMN IF NOT EXISTS status_corretor_1 TEXT DEFAULT 'pendente',
ADD COLUMN IF NOT EXISTS c1_corretor_2 INTEGER,
ADD COLUMN IF NOT EXISTS c2_corretor_2 INTEGER,
ADD COLUMN IF NOT EXISTS c3_corretor_2 INTEGER,
ADD COLUMN IF NOT EXISTS c4_corretor_2 INTEGER,
ADD COLUMN IF NOT EXISTS c5_corretor_2 INTEGER,
ADD COLUMN IF NOT EXISTS nota_final_corretor_2 INTEGER,
ADD COLUMN IF NOT EXISTS status_corretor_2 TEXT DEFAULT 'pendente',
ADD COLUMN IF NOT EXISTS corretor_id_1 UUID REFERENCES public.corretores(id),
ADD COLUMN IF NOT EXISTS corretor_id_2 UUID REFERENCES public.corretores(id);

-- Função para calcular média automática entre dois corretores
CREATE OR REPLACE FUNCTION public.calcular_media_corretores()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
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
$$;

-- Aplicar trigger nas três tabelas
DROP TRIGGER IF EXISTS trigger_calcular_media_enviadas ON public.redacoes_enviadas;
CREATE TRIGGER trigger_calcular_media_enviadas
  BEFORE UPDATE ON public.redacoes_enviadas
  FOR EACH ROW
  EXECUTE FUNCTION public.calcular_media_corretores();

DROP TRIGGER IF EXISTS trigger_calcular_media_simulado ON public.redacoes_simulado;
CREATE TRIGGER trigger_calcular_media_simulado
  BEFORE UPDATE ON public.redacoes_simulado
  FOR EACH ROW
  EXECUTE FUNCTION public.calcular_media_corretores();

DROP TRIGGER IF EXISTS trigger_calcular_media_exercicio ON public.redacoes_exercicio;
CREATE TRIGGER trigger_calcular_media_exercicio
  BEFORE UPDATE ON public.redacoes_exercicio
  FOR EACH ROW
  EXECUTE FUNCTION public.calcular_media_corretores();
