-- Criar trigger para calcular médias automaticamente em redacoes_enviadas
CREATE TRIGGER trigger_calcular_media_corretores
    BEFORE UPDATE ON public.redacoes_enviadas
    FOR EACH ROW
    EXECUTE FUNCTION public.calcular_media_corretores();

-- Criar trigger para calcular médias automaticamente em redacoes_simulado  
CREATE TRIGGER trigger_calcular_media_corretores_simulado
    BEFORE UPDATE ON public.redacoes_simulado
    FOR EACH ROW
    EXECUTE FUNCTION public.calcular_media_corretores();

-- Criar trigger para calcular médias automaticamente em redacoes_exercicio
CREATE TRIGGER trigger_calcular_media_corretores_exercicio
    BEFORE UPDATE ON public.redacoes_exercicio
    FOR EACH ROW
    EXECUTE FUNCTION public.calcular_media_corretores();