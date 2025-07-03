-- Limpar alertas finais do Supabase - verificar permissões e consistência

-- 1. Garantir que todas as funções tenham as permissões corretas
GRANT EXECUTE ON FUNCTION public.update_aulas_virtuais_updated_at() TO authenticated, anon;

-- 2. Verificar se há políticas RLS inconsistentes e corrigir
-- Recriar política para aulas_virtuais se houver conflito
DROP POLICY IF EXISTS "Public can view active aulas" ON public.aulas_virtuais;
CREATE POLICY "Public can view active aulas"
ON public.aulas_virtuais
FOR SELECT
TO anon, authenticated
USING (ativo = true);

-- 3. Garantir que visitantes possam acessar presença de aulas
DROP POLICY IF EXISTS "Visitantes podem registrar presença" ON public.presenca_aulas;
CREATE POLICY "Visitantes podem registrar presença"
ON public.presenca_aulas
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- 4. Corrigir possíveis problemas de encoding de array nas consultas
-- (isso pode ter causado alguns dos alertas de malformed array)

-- 5. Verificar integridade referencial 
ALTER TABLE public.presenca_aulas 
DROP CONSTRAINT IF EXISTS presenca_aulas_aula_id_fkey;

ALTER TABLE public.presenca_aulas 
ADD CONSTRAINT presenca_aulas_aula_id_fkey 
FOREIGN KEY (aula_id) REFERENCES public.aulas_virtuais(id) 
ON DELETE CASCADE;