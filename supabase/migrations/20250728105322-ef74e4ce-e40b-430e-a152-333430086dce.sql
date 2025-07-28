-- Adicionar policy temporária para permitir updates anônimos na tabela profiles (necessário para modo preview)
CREATE POLICY "Permitir update de avatar para usuários anônimos"
ON public.profiles
FOR UPDATE
TO public
USING (true)
WITH CHECK (true);