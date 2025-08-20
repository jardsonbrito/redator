-- Função para disparar renderização automática de redações digitadas
CREATE OR REPLACE FUNCTION public.trigger_essay_render()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Só dispara render para redações digitadas (sem manuscrita_url)
  IF NEW.redacao_manuscrita_url IS NULL AND NEW.render_status IS NULL THEN
    NEW.render_status := 'pending';
  END IF;
  
  RETURN NEW;
END;
$$;

-- Triggers para as três tabelas de redações
DROP TRIGGER IF EXISTS trigger_render_redacoes_enviadas ON public.redacoes_enviadas;
CREATE TRIGGER trigger_render_redacoes_enviadas
  BEFORE INSERT ON public.redacoes_enviadas
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_essay_render();

DROP TRIGGER IF EXISTS trigger_render_redacoes_simulado ON public.redacoes_simulado;
CREATE TRIGGER trigger_render_redacoes_simulado
  BEFORE INSERT ON public.redacoes_simulado
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_essay_render();

DROP TRIGGER IF EXISTS trigger_render_redacoes_exercicio ON public.redacoes_exercicio;
CREATE TRIGGER trigger_render_redacoes_exercicio
  BEFORE INSERT ON public.redacoes_exercicio
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_essay_render();