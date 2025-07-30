-- Adicionar campos de áudio específicos para cada corretor
ALTER TABLE public.redacoes_enviadas 
ADD COLUMN audio_url_corretor_1 TEXT,
ADD COLUMN audio_url_corretor_2 TEXT;

ALTER TABLE public.redacoes_simulado 
ADD COLUMN audio_url_corretor_1 TEXT,
ADD COLUMN audio_url_corretor_2 TEXT;

ALTER TABLE public.redacoes_exercicio 
ADD COLUMN audio_url_corretor_1 TEXT,
ADD COLUMN audio_url_corretor_2 TEXT;

-- Migrar dados existentes do campo audio_url para o campo apropriado baseado no corretor que tem dados
-- Para redacoes_enviadas
UPDATE public.redacoes_enviadas 
SET audio_url_corretor_1 = audio_url
WHERE audio_url IS NOT NULL 
AND (nota_final_corretor_1 IS NOT NULL OR status_corretor_1 = 'corrigida')
AND (nota_final_corretor_2 IS NULL AND status_corretor_2 != 'corrigida');

UPDATE public.redacoes_enviadas 
SET audio_url_corretor_2 = audio_url
WHERE audio_url IS NOT NULL 
AND (nota_final_corretor_2 IS NOT NULL OR status_corretor_2 = 'corrigida')
AND (nota_final_corretor_1 IS NULL AND status_corretor_1 != 'corrigida');

-- Para redacoes_simulado
UPDATE public.redacoes_simulado 
SET audio_url_corretor_1 = audio_url
WHERE audio_url IS NOT NULL 
AND (nota_final_corretor_1 IS NOT NULL OR status_corretor_1 = 'corrigida')
AND (nota_final_corretor_2 IS NULL AND status_corretor_2 != 'corrigida');

UPDATE public.redacoes_simulado 
SET audio_url_corretor_2 = audio_url
WHERE audio_url IS NOT NULL 
AND (nota_final_corretor_2 IS NOT NULL OR status_corretor_2 = 'corrigida')
AND (nota_final_corretor_1 IS NULL AND status_corretor_1 != 'corrigida');

-- Para redacoes_exercicio
UPDATE public.redacoes_exercicio 
SET audio_url_corretor_1 = audio_url
WHERE audio_url IS NOT NULL 
AND (nota_final_corretor_1 IS NOT NULL OR status_corretor_1 = 'corrigida')
AND (nota_final_corretor_2 IS NULL AND status_corretor_2 != 'corrigida');

UPDATE public.redacoes_exercicio 
SET audio_url_corretor_2 = audio_url
WHERE audio_url IS NOT NULL 
AND (nota_final_corretor_2 IS NOT NULL OR status_corretor_2 = 'corrigida')
AND (nota_final_corretor_1 IS NULL AND status_corretor_1 != 'corrigida');