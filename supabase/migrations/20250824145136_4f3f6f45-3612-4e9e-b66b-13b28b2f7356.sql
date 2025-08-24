-- Ativar RLS nas tabelas que estão sem proteção
ALTER TABLE public.presenca_aulas_backup ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rpc_log ENABLE ROW LEVEL SECURITY;

-- Criar políticas para admin apenas nessas tabelas de backup/log
CREATE POLICY "Admin only access presenca_aulas_backup" 
ON public.presenca_aulas_backup 
FOR ALL 
USING (is_main_admin());

CREATE POLICY "Admin only access rpc_log" 
ON public.rpc_log 
FOR ALL 
USING (is_main_admin());