-- Primeiro vamos verificar e remover constraints de foreign key problemáticas
-- que podem estar referenciando auth.users

-- Verificar constraints existentes
DO $$
BEGIN
    -- Remover constraint de foreign key se existir em redacoes_enviadas
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'redacoes_enviadas_user_id_fkey' 
        AND table_name = 'redacoes_enviadas'
    ) THEN
        ALTER TABLE public.redacoes_enviadas DROP CONSTRAINT redacoes_enviadas_user_id_fkey;
    END IF;
    
    -- Remover constraint de foreign key se existir em redacoes_simulado
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'redacoes_simulado_user_id_fkey' 
        AND table_name = 'redacoes_simulado'
    ) THEN
        ALTER TABLE public.redacoes_simulado DROP CONSTRAINT redacoes_simulado_user_id_fkey;
    END IF;
    
    -- Remover constraint de foreign key se existir em redacoes_exercicio
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'redacoes_exercicio_user_id_fkey' 
        AND table_name = 'redacoes_exercicio'
    ) THEN
        ALTER TABLE public.redacoes_exercicio DROP CONSTRAINT redacoes_exercicio_user_id_fkey;
    END IF;
END $$;

-- Agora vamos preencher os user_id que estão null nas redações existentes
-- Usando o email_aluno para fazer o match com a tabela profiles

-- Atualizar redacoes_enviadas
UPDATE public.redacoes_enviadas 
SET user_id = p.id
FROM public.profiles p
WHERE redacoes_enviadas.user_id IS NULL 
AND redacoes_enviadas.email_aluno IS NOT NULL
AND LOWER(TRIM(redacoes_enviadas.email_aluno)) = LOWER(TRIM(p.email))
AND p.user_type = 'aluno';

-- Atualizar redacoes_simulado  
UPDATE public.redacoes_simulado
SET user_id = p.id
FROM public.profiles p
WHERE redacoes_simulado.user_id IS NULL
AND redacoes_simulado.email_aluno IS NOT NULL  
AND LOWER(TRIM(redacoes_simulado.email_aluno)) = LOWER(TRIM(p.email))
AND p.user_type = 'aluno';

-- Atualizar redacoes_exercicio
UPDATE public.redacoes_exercicio
SET user_id = p.id  
FROM public.profiles p
WHERE redacoes_exercicio.user_id IS NULL
AND redacoes_exercicio.email_aluno IS NOT NULL
AND LOWER(TRIM(redacoes_exercicio.email_aluno)) = LOWER(TRIM(p.email))
AND p.user_type = 'aluno';