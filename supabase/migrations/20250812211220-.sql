-- Adicionar campo gender na tabela profiles se não existe
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS gender text 
CHECK (gender IN ('M', 'F', 'NB', 'U')) 
DEFAULT 'U';