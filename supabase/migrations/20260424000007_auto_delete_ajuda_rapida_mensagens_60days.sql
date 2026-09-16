-- Deleta automaticamente mensagens do Ajuda Rápida com mais de 60 dias.
-- Hard delete — sem soft delete nem arquivamento.
-- Roda todo dia às 03:00 UTC via pg_cron.

CREATE EXTENSION IF NOT EXISTS pg_cron;

GRANT USAGE ON SCHEMA cron TO postgres;

-- Idempotente: remove agendamento anterior antes de recriar
SELECT cron.unschedule('delete_ajuda_rapida_mensagens_60d')
WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'delete_ajuda_rapida_mensagens_60d'
);

SELECT cron.schedule(
  'delete_ajuda_rapida_mensagens_60d',
  '0 3 * * *',
  $$
    DELETE FROM public.ajuda_rapida_mensagens
    WHERE criado_em < NOW() - INTERVAL '60 days';
  $$
);
