-- Adicionar colunas para armazenar URLs de arquivos de correção dos corretores

-- Para redacoes_enviadas
ALTER TABLE public.redacoes_enviadas 
ADD COLUMN correcao_arquivo_url_corretor_1 TEXT,
ADD COLUMN correcao_arquivo_url_corretor_2 TEXT;

-- Para redacoes_simulado
ALTER TABLE public.redacoes_simulado 
ADD COLUMN correcao_arquivo_url_corretor_1 TEXT,
ADD COLUMN correcao_arquivo_url_corretor_2 TEXT;

-- Para redacoes_exercicio
ALTER TABLE public.redacoes_exercicio 
ADD COLUMN correcao_arquivo_url_corretor_1 TEXT,
ADD COLUMN correcao_arquivo_url_corretor_2 TEXT;