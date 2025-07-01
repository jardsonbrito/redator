
-- Adicionar campo de status aos temas para controlar publicação/rascunho
ALTER TABLE public.temas 
ADD COLUMN status TEXT DEFAULT 'publicado' CHECK (status IN ('publicado', 'rascunho'));

-- Adicionar campo tema_id aos simulados para relacionar com temas
ALTER TABLE public.simulados 
ADD COLUMN tema_id UUID REFERENCES public.temas(id);

-- Adicionar campo cabeçalho ENEM aos temas
ALTER TABLE public.temas 
ADD COLUMN cabecalho_enem TEXT DEFAULT 'Com base na leitura dos textos motivadores e nos conhecimentos construídos ao longo de sua formação, redija texto dissertativo-argumentativo em modalidade escrita formal da língua portuguesa sobre o tema apresentado, apresentando proposta de intervenção que respeite os direitos humanos. Selecione, organize e relacione, de forma coerente e coesa, argumentos e fatos para defesa de seu ponto de vista.';

-- Função para publicar automaticamente tema após encerramento do simulado
CREATE OR REPLACE FUNCTION public.auto_publish_tema_after_simulado()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql;

-- Trigger para executar a função de auto-publicação
CREATE OR REPLACE TRIGGER trigger_auto_publish_tema
  AFTER UPDATE ON public.simulados
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_publish_tema_after_simulado();

-- Função para verificar se simulado está encerrado e publicar tema
CREATE OR REPLACE FUNCTION public.check_and_publish_expired_simulados()
RETURNS void AS $$
BEGIN
  UPDATE public.temas 
  SET status = 'publicado' 
  WHERE id IN (
    SELECT s.tema_id 
    FROM public.simulados s 
    WHERE s.tema_id IS NOT NULL 
    AND (s.data_fim || ' ' || s.hora_fim)::timestamp < NOW()
    AND EXISTS (
      SELECT 1 FROM public.temas t 
      WHERE t.id = s.tema_id AND t.status = 'rascunho'
    )
  );
END;
$$ LANGUAGE plpgsql;
