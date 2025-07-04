
-- Normalizar todos os e-mails existentes na tabela profiles (alunos)
UPDATE public.profiles 
SET email = LOWER(TRIM(email))
WHERE user_type = 'aluno';

-- Criar índice para melhorar performance nas consultas por email
CREATE INDEX IF NOT EXISTS idx_profiles_email_normalized 
ON public.profiles (LOWER(TRIM(email))) 
WHERE user_type = 'aluno';

-- Garantir que a política RLS permite leitura para login
DROP POLICY IF EXISTS "Public can read student profiles for login" ON public.profiles;
CREATE POLICY "Public can read student profiles for login" 
ON public.profiles 
FOR SELECT 
USING (user_type = 'aluno');
