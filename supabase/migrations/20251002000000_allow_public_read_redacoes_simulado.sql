-- Permitir leitura pública de redacoes_simulado (similar a redacoes_enviadas)
-- Isso é necessário pois o sistema não usa Supabase Auth para admin

CREATE POLICY IF NOT EXISTS "Public can view redacoes_simulado"
ON public.redacoes_simulado
FOR SELECT
USING (true);
