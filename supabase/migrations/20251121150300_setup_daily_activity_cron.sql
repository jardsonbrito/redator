-- Migration: Configurar cron job para processar atividades diárias
-- Data: 2025-11-21
-- Objetivo: Executar a função process_student_daily_activity todos os dias às 03:00 (America/Fortaleza)

-- Garantir que a extensão pg_cron está habilitada
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Remover job existente se houver (ignorar erros se não existir)
DO $$
BEGIN
  PERFORM cron.unschedule('process-student-daily-activity');
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Job não existia, continuando...';
END $$;

-- Criar cron job para executar às 03:00 (horário de Fortaleza - UTC-3)
-- Como pg_cron usa UTC, precisamos ajustar para 06:00 UTC (03:00 BRT)
SELECT cron.schedule(
  'process-student-daily-activity',
  '0 6 * * *', -- Executa às 06:00 UTC (03:00 BRT)
  $$
  SELECT public.process_student_daily_activity(CURRENT_DATE);
  $$
);

-- Comentário
COMMENT ON EXTENSION pg_cron IS 'Agendador de tarefas para PostgreSQL';

-- Log de sucesso
DO $$
BEGIN
  RAISE NOTICE '✅ Cron job configurado com sucesso!';
  RAISE NOTICE 'ℹ️  O job "process-student-daily-activity" será executado diariamente às 03:00 (America/Fortaleza)';
  RAISE NOTICE 'ℹ️  Para verificar os jobs: SELECT * FROM cron.job;';
  RAISE NOTICE 'ℹ️  Para verificar execuções: SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 10;';
END $$;
