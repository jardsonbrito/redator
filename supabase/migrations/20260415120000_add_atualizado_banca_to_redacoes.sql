-- Adiciona campos de validação da banca examinadora na tabela de redações exemplares
ALTER TABLE public.redacoes
  ADD COLUMN IF NOT EXISTS atualizado_banca BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS ano_banca INTEGER;

COMMENT ON COLUMN public.redacoes.atualizado_banca IS 'Indica se a redação foi revisada e validada conforme as exigências atuais da banca examinadora do ENEM';
COMMENT ON COLUMN public.redacoes.ano_banca IS 'Ano da banca examinadora para o qual a redação foi validada. Se nulo, o sistema usa o ano corrente';
