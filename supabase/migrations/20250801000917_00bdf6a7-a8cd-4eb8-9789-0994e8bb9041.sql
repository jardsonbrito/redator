-- Adicionar campo para marcar mensagens editadas
ALTER TABLE public.ajuda_rapida_mensagens 
ADD COLUMN editada BOOLEAN DEFAULT false,
ADD COLUMN editada_em TIMESTAMP WITH TIME ZONE;