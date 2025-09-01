-- Adicionar coluna para controlar se corretor aparece no formulário de envio
ALTER TABLE corretores ADD COLUMN visivel_no_formulario boolean NOT NULL DEFAULT true;