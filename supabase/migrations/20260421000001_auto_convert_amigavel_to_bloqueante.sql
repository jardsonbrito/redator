-- Converte automaticamente mensagens "amigável" sem resposta após 4 dias para "bloqueante".
-- A ausência de resposta significa: a mensagem tem ao menos 1 recipient com status != 'respondida'.

CREATE OR REPLACE FUNCTION public.converter_amigavel_para_bloqueante()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count integer;
BEGIN
  UPDATE public.inbox_messages im
  SET    type = 'bloqueante'
  WHERE  im.type = 'amigavel'
    AND  im.created_at < NOW() - INTERVAL '4 days'
    AND  EXISTS (
           SELECT 1
           FROM   public.inbox_recipients ir
           WHERE  ir.message_id = im.id
             AND  ir.status != 'respondida'
         );

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

-- Aplicar imediatamente às mensagens existentes
SELECT public.converter_amigavel_para_bloqueante();

-- Agendar execução diária às 06:00 UTC
SELECT cron.schedule(
  'converter-amigavel-bloqueante-4dias',
  '0 6 * * *',
  $$ SELECT public.converter_amigavel_para_bloqueante(); $$
);
