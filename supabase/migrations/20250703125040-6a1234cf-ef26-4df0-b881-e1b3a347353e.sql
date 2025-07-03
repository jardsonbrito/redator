-- Adicionar campo para controlar abertura de Google Forms em aba externa
ALTER TABLE public.exercicios 
ADD COLUMN abrir_aba_externa boolean DEFAULT false;

-- Comentário da coluna para documentação
COMMENT ON COLUMN public.exercicios.abrir_aba_externa IS 'Se true, abre Google Forms em aba externa. Se false, abre embutido no app.';