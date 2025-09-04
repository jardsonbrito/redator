-- Atualizar automaticamente a data de publicação para temas publicados que não têm data
UPDATE public.temas 
SET published_at = COALESCE(published_at, now())
WHERE status = 'publicado' AND published_at IS NULL;

-- Criar trigger para definir automaticamente a data de publicação
CREATE OR REPLACE FUNCTION public.set_published_at()
RETURNS TRIGGER AS $$
BEGIN
  -- Se o status está mudando para 'publicado' e não há data definida
  IF NEW.status = 'publicado' AND NEW.published_at IS NULL THEN
    NEW.published_at = now();
  END IF;
  
  -- Se o status está mudando de 'publicado' para outro status, limpar a data
  IF OLD.status = 'publicado' AND NEW.status != 'publicado' THEN
    NEW.published_at = NULL;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Criar trigger para temas
DROP TRIGGER IF EXISTS trigger_set_published_at ON public.temas;
CREATE TRIGGER trigger_set_published_at
  BEFORE INSERT OR UPDATE ON public.temas
  FOR EACH ROW
  EXECUTE FUNCTION public.set_published_at();