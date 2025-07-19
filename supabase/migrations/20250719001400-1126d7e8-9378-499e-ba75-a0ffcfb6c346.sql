-- Adicionar foreign keys para a tabela ajuda_rapida_mensagens
ALTER TABLE public.ajuda_rapida_mensagens 
ADD CONSTRAINT fk_ajuda_rapida_aluno 
FOREIGN KEY (aluno_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.ajuda_rapida_mensagens 
ADD CONSTRAINT fk_ajuda_rapida_corretor 
FOREIGN KEY (corretor_id) REFERENCES public.corretores(id) ON DELETE CASCADE;