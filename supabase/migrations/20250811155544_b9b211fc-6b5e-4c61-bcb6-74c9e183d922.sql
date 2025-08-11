-- Enable required extensions for cron jobs
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Remove existing cron job if it exists
SELECT cron.unschedule('auto-publish-scheduled-themes');

-- Create the cron job to run the theme publisher every minute
SELECT cron.schedule(
  'auto-publish-scheduled-themes',
  '* * * * *', -- Run every minute
  $$
  SELECT net.http_post(
    url := 'https://kgmxntpmvlnbftjqtyxx.supabase.co/functions/v1/schedule-tema-publisher',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtnbXhudHBtdmxuYmZ0anF0eXh4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA5Nzk3MzQsImV4cCI6MjA2NjU1NTczNH0.57rSKhhANhbPH4-KMS8D6EuxW1dhAimML-rPNSlnEX0"}'::jsonb,
    body := '{"source": "cron"}'::jsonb
  );
  $$
);