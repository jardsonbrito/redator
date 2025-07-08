-- Adicionar campos de data e hora para exercícios do tipo "Redação com Frase Temática"
ALTER TABLE public.exercicios 
ADD COLUMN data_inicio date,
ADD COLUMN hora_inicio time without time zone,
ADD COLUMN data_fim date,
ADD COLUMN hora_fim time without time zone;

-- Comentário: Estes campos são opcionais e usados apenas para exercícios do tipo "Redação com Frase Temática"