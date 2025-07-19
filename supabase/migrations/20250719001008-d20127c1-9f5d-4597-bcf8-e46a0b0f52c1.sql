-- Configurar cron job para limpeza automática de mensagens antigas (30 dias)
-- Habilitar extensões necessárias
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Agendar limpeza automática mensal (dia 1 às 02:00)
SELECT cron.schedule(
  'limpar-mensagens-ajuda-rapida',
  '0 2 1 * *', -- Todo dia 1 do mês às 02:00
  $$SELECT public.limpar_mensagens_antigas();$$
);