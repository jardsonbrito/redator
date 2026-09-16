-- Adicionar campo turmas_autorizadas à tabela corretores
-- Este campo armazena as turmas que o corretor está autorizado a visualizar
-- quando está disponível (visivel_no_formulario = true)

ALTER TABLE corretores
ADD COLUMN turmas_autorizadas text[] DEFAULT NULL;

COMMENT ON COLUMN corretores.turmas_autorizadas IS 'Lista de turmas autorizadas para o corretor. NULL significa todas as turmas.';
