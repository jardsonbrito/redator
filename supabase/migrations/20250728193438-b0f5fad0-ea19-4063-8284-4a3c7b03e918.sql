-- Primeiro, vamos listar todas as políticas atuais nas tabelas de redação
-- e criar políticas temporárias super permissivas para debug

-- Remover políticas conflitantes se existirem
DROP POLICY IF EXISTS "Authenticated users can update audio_url in redacoes_enviadas" ON public.redacoes_enviadas;
DROP POLICY IF EXISTS "Authenticated users can update audio_url in redacoes_simulado" ON public.redacoes_simulado;
DROP POLICY IF EXISTS "Authenticated users can update audio_url in redacoes_exercicio" ON public.redacoes_exercicio;

-- Criar políticas temporárias super permissivas para debug (APENAS PARA TESTE)
CREATE POLICY "TEMP_DEBUG_redacoes_enviadas_audio" 
ON public.redacoes_enviadas 
FOR ALL
USING (true)
WITH CHECK (true);

CREATE POLICY "TEMP_DEBUG_redacoes_simulado_audio" 
ON public.redacoes_simulado 
FOR ALL
USING (true)
WITH CHECK (true);

CREATE POLICY "TEMP_DEBUG_redacoes_exercicio_audio" 
ON public.redacoes_exercicio 
FOR ALL
USING (true)
WITH CHECK (true);

-- Verificar se RLS está ativa (deve estar true)
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('redacoes_enviadas', 'redacoes_simulado', 'redacoes_exercicio');