-- Criar aula de teste
INSERT INTO public.aulas (titulo, descricao, modulo, link_conteudo, permite_visitante, ativo) 
VALUES (
  'Competência 1: Demonstrar domínio da norma padrão',
  'Aula introdutória sobre o domínio da norma padrão da língua portuguesa escrita.',
  'Competência 1',
  'https://youtube.com/watch?v=demo1',
  true,
  true
);

-- Criar exercício de teste
INSERT INTO public.exercicios (titulo, tipo, permite_visitante, ativo)
VALUES (
  'Exercício Prático - Norma Padrão',
  'Google Forms',
  true,
  true
);