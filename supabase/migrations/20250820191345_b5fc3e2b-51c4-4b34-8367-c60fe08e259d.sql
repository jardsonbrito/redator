-- Primeiro, vamos verificar as constraints atuais da tabela radar_dados
SELECT 
  constraint_name, 
  constraint_type 
FROM information_schema.table_constraints 
WHERE table_name = 'radar_dados';

-- Criar a constraint única necessária para o ON CONFLICT funcionar
CREATE UNIQUE INDEX IF NOT EXISTS radar_dados_unique_key 
ON public.radar_dados (email_aluno, titulo_exercicio, data_realizacao);

-- Adicionar constraint única baseada no índice
ALTER TABLE public.radar_dados 
ADD CONSTRAINT radar_dados_email_titulo_data_unique 
UNIQUE USING INDEX radar_dados_unique_key;