
-- Adicionar campos de comentários pedagógicos para cada corretor nas tabelas de redações
ALTER TABLE public.redacoes_enviadas 
ADD COLUMN comentario_c1_corretor_1 text,
ADD COLUMN comentario_c2_corretor_1 text,
ADD COLUMN comentario_c3_corretor_1 text,
ADD COLUMN comentario_c4_corretor_1 text,
ADD COLUMN comentario_c5_corretor_1 text,
ADD COLUMN elogios_pontos_atencao_corretor_1 text,
ADD COLUMN comentario_c1_corretor_2 text,
ADD COLUMN comentario_c2_corretor_2 text,
ADD COLUMN comentario_c3_corretor_2 text,
ADD COLUMN comentario_c4_corretor_2 text,
ADD COLUMN comentario_c5_corretor_2 text,
ADD COLUMN elogios_pontos_atencao_corretor_2 text;

ALTER TABLE public.redacoes_simulado 
ADD COLUMN comentario_c1_corretor_1 text,
ADD COLUMN comentario_c2_corretor_1 text,
ADD COLUMN comentario_c3_corretor_1 text,
ADD COLUMN comentario_c4_corretor_1 text,
ADD COLUMN comentario_c5_corretor_1 text,
ADD COLUMN elogios_pontos_atencao_corretor_1 text,
ADD COLUMN comentario_c1_corretor_2 text,
ADD COLUMN comentario_c2_corretor_2 text,
ADD COLUMN comentario_c3_corretor_2 text,
ADD COLUMN comentario_c4_corretor_2 text,
ADD COLUMN comentario_c5_corretor_2 text,
ADD COLUMN elogios_pontos_atencao_corretor_2 text;

ALTER TABLE public.redacoes_exercicio 
ADD COLUMN comentario_c1_corretor_1 text,
ADD COLUMN comentario_c2_corretor_1 text,
ADD COLUMN comentario_c3_corretor_1 text,
ADD COLUMN comentario_c4_corretor_1 text,
ADD COLUMN comentario_c5_corretor_1 text,
ADD COLUMN elogios_pontos_atencao_corretor_1 text,
ADD COLUMN comentario_c1_corretor_2 text,
ADD COLUMN comentario_c2_corretor_2 text,
ADD COLUMN comentario_c3_corretor_2 text,
ADD COLUMN comentario_c4_corretor_2 text,
ADD COLUMN comentario_c5_corretor_2 text,
ADD COLUMN elogios_pontos_atencao_corretor_2 text;
