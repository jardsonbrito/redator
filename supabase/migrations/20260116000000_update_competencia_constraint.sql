-- Atualizar constraint da coluna competencia para aceitar valores de 1 a 6
-- Incluindo a nova competência 6 (PA - Ponto de Atenção)

-- Remover constraint antiga
ALTER TABLE public.marcacoes_visuais
  DROP CONSTRAINT IF EXISTS marcacoes_visuais_competencia_check;

-- Adicionar nova constraint que aceita valores de 1 a 6
ALTER TABLE public.marcacoes_visuais
  ADD CONSTRAINT marcacoes_visuais_competencia_check
  CHECK (competencia BETWEEN 1 AND 6);

-- Comentário explicativo
COMMENT ON COLUMN public.marcacoes_visuais.competencia IS
  'Competência ENEM: 1-5 = Competências padrão, 6 = Ponto de Atenção (PA)';
