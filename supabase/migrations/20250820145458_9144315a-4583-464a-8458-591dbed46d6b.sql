-- Add automatic rendering trigger for typed essays
-- First, let's make sure the columns exist with proper defaults
ALTER TABLE redacoes_enviadas 
  ALTER COLUMN render_status SET DEFAULT 'pending',
  ALTER COLUMN render_image_url SET DEFAULT NULL;

ALTER TABLE redacoes_simulado 
  ALTER COLUMN render_status SET DEFAULT 'pending',
  ALTER COLUMN render_image_url SET DEFAULT NULL;

ALTER TABLE redacoes_exercicio 
  ALTER COLUMN render_status SET DEFAULT 'pending',
  ALTER COLUMN render_image_url SET DEFAULT NULL;

-- Function to trigger automatic essay rendering for typed essays
CREATE OR REPLACE FUNCTION auto_trigger_essay_render()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Only trigger render for typed essays (no manuscrita_url)
  -- And only set status if it's not already set
  IF NEW.redacao_manuscrita_url IS NULL AND 
     (NEW.render_status IS NULL OR NEW.render_status = '') THEN
    NEW.render_status := 'pending';
    NEW.render_image_url := NULL;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Add triggers to all essay tables for automatic rendering
DROP TRIGGER IF EXISTS trigger_auto_render_redacoes_enviadas ON redacoes_enviadas;
CREATE TRIGGER trigger_auto_render_redacoes_enviadas
  BEFORE INSERT ON redacoes_enviadas
  FOR EACH ROW
  EXECUTE FUNCTION auto_trigger_essay_render();

DROP TRIGGER IF EXISTS trigger_auto_render_redacoes_simulado ON redacoes_simulado;
CREATE TRIGGER trigger_auto_render_redacoes_simulado
  BEFORE INSERT ON redacoes_simulado
  FOR EACH ROW
  EXECUTE FUNCTION auto_trigger_essay_render();

DROP TRIGGER IF EXISTS trigger_auto_render_redacoes_exercicio ON redacoes_exercicio;
CREATE TRIGGER trigger_auto_render_redacoes_exercicio
  BEFORE INSERT ON redacoes_exercicio
  FOR EACH ROW
  EXECUTE FUNCTION auto_trigger_essay_render();